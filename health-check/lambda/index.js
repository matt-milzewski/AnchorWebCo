'use strict';

const { randomUUID } = require('crypto');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const { SESv2Client, SendEmailCommand } = require('@aws-sdk/client-sesv2');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const ssmClient = new SSMClient({});
const sesClient = new SESv2Client({});
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
    marshallOptions: {
        removeUndefinedValues: true
    }
});

const SCORE_WEIGHTS = {
    performance: 0.5,
    seo: 0.25,
    best_practices: 0.15,
    accessibility: 0.1
};

const FALLBACK_FIXES = [
    'Compress large images and serve next-gen formats such as WebP or AVIF.',
    'Reduce unused JavaScript and CSS so pages render faster.',
    'Set explicit width and height for media to prevent layout shifts.',
    'Improve above-the-fold content loading to lower LCP.',
    'Tighten metadata and heading structure for stronger SEO signals.'
];

const FIX_BY_AUDIT_ID = {
    'render-blocking-resources': 'Remove render-blocking CSS and JavaScript so visitors see content faster.',
    'unused-javascript': 'Reduce unused JavaScript and defer non-critical scripts.',
    'unused-css-rules': 'Remove unused CSS to cut page weight.',
    'uses-optimized-images': 'Compress and resize images before upload to improve load speed.',
    'modern-image-formats': 'Serve images in modern formats like WebP or AVIF.',
    'offscreen-images': 'Lazy-load below-the-fold images.',
    'uses-text-compression': 'Enable Brotli or Gzip compression on text responses.',
    'largest-contentful-paint-element': 'Prioritize and optimize your main hero content to improve LCP.',
    'server-response-time': 'Reduce server response time with caching and faster backend processing.',
    'legacy-javascript': 'Ship modern JavaScript for modern browsers and reduce legacy polyfills.',
    'diagnostics': 'Fix Lighthouse diagnostics with the largest estimated performance impact.',
    'dom-size': 'Reduce excessive DOM size to improve rendering and interactivity.',
    'cumulative-layout-shift': 'Prevent layout shifts by reserving space for images, embeds, and dynamic elements.',
    'interactive': 'Reduce main-thread work so pages become interactive faster.',
    'bootup-time': 'Trim third-party scripts and heavy JavaScript to reduce startup time.',
    'total-byte-weight': 'Cut total page weight by reducing large assets and requests.',
    'mainthread-work-breakdown': 'Reduce heavy JavaScript execution on the main thread.',
    'font-display': 'Set font-display to swap and optimize webfont loading behavior.',
    'uses-long-cache-ttl': 'Set longer cache lifetimes for static assets.',
    'redirects': 'Eliminate unnecessary redirects so pages start rendering sooner.',
    'is-crawlable': 'Ensure key pages are crawlable and not blocked from search engines.',
    'document-title': 'Add clear, unique page titles to key pages.',
    'meta-description': 'Write stronger meta descriptions to improve search click-through rate.',
    'link-text': 'Use descriptive link text so users and search engines understand destination pages.',
    'image-alt': 'Add descriptive alt text to important images.',
    'label': 'Ensure form inputs have clear labels for accessibility.',
    'aria-valid-attr': 'Fix invalid ARIA usage to improve accessibility and assistive technology support.'
};

let cachedPageSpeedApiKey = null;

exports.handler = async (event) => {
    const requestOrigin = getHeader(event, 'origin');
    const corsOrigin = resolveCorsOrigin(requestOrigin);

    if (requestOrigin && !corsOrigin) {
        return jsonResponse(403, {
            error: 'Origin not allowed.'
        }, null);
    }

    const method = event?.requestContext?.http?.method || event?.httpMethod || 'POST';

    if (method === 'OPTIONS') {
        return {
            statusCode: 204,
            headers: buildCorsHeaders(corsOrigin),
            body: ''
        };
    }

    if (method !== 'POST') {
        return jsonResponse(405, {
            error: 'Method not allowed.'
        }, corsOrigin);
    }

    try {
        const body = parseJsonBody(event);
        const normalizedUrl = normalizeUrl(body.website_url);

        const email = normalizeEmail(body.email);
        const emailConsent = Boolean(body.email_consent);

        if (email && !emailConsent) {
            throw httpError(400, 'Please provide consent to email the report.');
        }

        const sourceIp = getSourceIp(event);
        await enforceRateLimit(sourceIp);

        const apiKey = await getPageSpeedApiKey();

        const [mobileResult, desktopResult, extraChecks] = await Promise.all([
            runPageSpeed(normalizedUrl.toString(), 'mobile', apiKey),
            runPageSpeed(normalizedUrl.toString(), 'desktop', apiKey),
            runExtraChecks(normalizedUrl)
        ]);

        const mobileCategoryScores = extractCategoryScores(mobileResult?.lighthouseResult);
        const desktopCategoryScores = extractCategoryScores(desktopResult?.lighthouseResult);

        const categoryScores = averageCategoryScores(mobileCategoryScores, desktopCategoryScores);
        const overallScore = computeOverallScore(categoryScores);
        const coreWebVitals = extractCoreWebVitals(mobileResult, desktopResult);
        const topFixes = generateTopFixes([
            { strategy: 'mobile', lighthouseResult: mobileResult?.lighthouseResult },
            { strategy: 'desktop', lighthouseResult: desktopResult?.lighthouseResult }
        ]);

        const runId = randomUUID();
        const createdAt = new Date().toISOString();

        const reportPayload = {
            run_id: runId,
            created_at: createdAt,
            website_url: normalizedUrl.toString(),
            overall_score: overallScore,
            category_scores: categoryScores,
            strategy_scores: {
                mobile: mobileCategoryScores,
                desktop: desktopCategoryScores
            },
            mobile_score: mobileCategoryScores.performance,
            desktop_score: desktopCategoryScores.performance,
            core_web_vitals: coreWebVitals,
            top_fixes: topFixes,
            extra_checks: extraChecks,
            email_sent: false,
            saved: false,
            warnings: []
        };

        reportPayload.saved = await saveRun(reportPayload, email);

        if (email && emailConsent) {
            reportPayload.email_sent = await sendReportEmail(email, reportPayload);
            if (!reportPayload.email_sent) {
                reportPayload.warnings.push('We could not send the email report right now.');
            }
        }

        if (!reportPayload.saved) {
            reportPayload.warnings.push('Report storage is not configured or failed.');
        }

        return jsonResponse(200, reportPayload, corsOrigin);
    } catch (error) {
        if (error?.name === 'AbortError') {
            return jsonResponse(504, {
                error: 'The health check timed out. Please try again.'
            }, corsOrigin);
        }

        if (error?.statusCode) {
            return jsonResponse(error.statusCode, {
                error: error.message
            }, corsOrigin);
        }

        console.error('Unhandled health check error:', error);
        return jsonResponse(500, {
            error: 'Unable to run the health check right now. Please try again shortly.'
        }, corsOrigin);
    }
};

function parseJsonBody(event) {
    const rawBody = event?.isBase64Encoded
        ? Buffer.from(event.body || '', 'base64').toString('utf8')
        : (event?.body || '{}');

    let parsed;
    try {
        parsed = JSON.parse(rawBody);
    } catch (error) {
        throw httpError(400, 'Request body must be valid JSON.');
    }

    if (!parsed || typeof parsed !== 'object') {
        throw httpError(400, 'Request body must be a JSON object.');
    }

    return parsed;
}

function normalizeUrl(input) {
    if (typeof input !== 'string' || !input.trim()) {
        throw httpError(400, 'website_url is required.');
    }

    let candidate = input.trim();
    if (!/^https?:\/\//i.test(candidate)) {
        candidate = `https://${candidate}`;
    }

    let parsed;
    try {
        parsed = new URL(candidate);
    } catch (error) {
        throw httpError(400, 'website_url must be a valid URL.');
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw httpError(400, 'website_url must start with http:// or https://.');
    }

    parsed.hash = '';
    return parsed;
}

function normalizeEmail(input) {
    if (!input) {
        return null;
    }

    if (typeof input !== 'string') {
        throw httpError(400, 'email must be a string when provided.');
    }

    const email = input.trim().toLowerCase();
    if (!email) {
        return null;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw httpError(400, 'email is not valid.');
    }

    return email;
}

async function getPageSpeedApiKey() {
    if (cachedPageSpeedApiKey) {
        return cachedPageSpeedApiKey;
    }

    const paramName = process.env.PAGESPEED_API_KEY_PARAM;
    if (!paramName) {
        throw httpError(500, 'PageSpeed API key parameter is not configured.');
    }

    const response = await ssmClient.send(new GetParameterCommand({
        Name: paramName,
        WithDecryption: true
    }));

    const key = response?.Parameter?.Value?.trim();
    if (!key) {
        throw httpError(500, 'PageSpeed API key is empty.');
    }

    cachedPageSpeedApiKey = key;
    return key;
}

async function runPageSpeed(targetUrl, strategy, apiKey) {
    const url = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
    url.searchParams.set('url', targetUrl);
    url.searchParams.set('strategy', strategy);
    url.searchParams.set('key', apiKey);

    ['performance', 'seo', 'best-practices', 'accessibility'].forEach((category) => {
        url.searchParams.append('category', category);
    });

    const timeoutMs = Number(process.env.PAGESPEED_TIMEOUT_MS || 18000);
    const response = await fetchWithTimeout(url.toString(), {
        method: 'GET',
        headers: {
            'Accept': 'application/json'
        }
    }, timeoutMs);

    if (!response.ok) {
        throw httpError(502, `Google PageSpeed request failed for ${strategy}.`);
    }

    const payload = await response.json();

    if (!payload?.lighthouseResult?.categories) {
        throw httpError(502, `Google PageSpeed response for ${strategy} was incomplete.`);
    }

    return payload;
}

function extractCategoryScores(lighthouseResult) {
    const categories = lighthouseResult?.categories || {};

    return {
        performance: scoreToHundred(categories?.performance?.score),
        seo: scoreToHundred(categories?.seo?.score),
        best_practices: scoreToHundred(categories?.['best-practices']?.score),
        accessibility: scoreToHundred(categories?.accessibility?.score)
    };
}

function scoreToHundred(value) {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        return 0;
    }

    return Math.max(0, Math.min(100, Math.round(value * 100)));
}

function averageCategoryScores(mobileScores, desktopScores) {
    return {
        performance: averageTwo(mobileScores.performance, desktopScores.performance),
        seo: averageTwo(mobileScores.seo, desktopScores.seo),
        best_practices: averageTwo(mobileScores.best_practices, desktopScores.best_practices),
        accessibility: averageTwo(mobileScores.accessibility, desktopScores.accessibility)
    };
}

function averageTwo(a, b) {
    return Math.round((Number(a || 0) + Number(b || 0)) / 2);
}

function computeOverallScore(categoryScores) {
    const weightedScore =
        (categoryScores.performance * SCORE_WEIGHTS.performance) +
        (categoryScores.seo * SCORE_WEIGHTS.seo) +
        (categoryScores.best_practices * SCORE_WEIGHTS.best_practices) +
        (categoryScores.accessibility * SCORE_WEIGHTS.accessibility);

    return Math.round(weightedScore);
}

function extractCoreWebVitals(mobileResult, desktopResult) {
    const candidates = [
        {
            source: 'loadingExperience',
            metrics: mobileResult?.loadingExperience?.metrics
        },
        {
            source: 'originLoadingExperience',
            metrics: mobileResult?.originLoadingExperience?.metrics
        },
        {
            source: 'desktopLoadingExperience',
            metrics: desktopResult?.loadingExperience?.metrics
        },
        {
            source: 'desktopOriginLoadingExperience',
            metrics: desktopResult?.originLoadingExperience?.metrics
        }
    ];

    const chosen = candidates.find((candidate) => {
        const metrics = candidate.metrics || {};
        return (
            metrics.LARGEST_CONTENTFUL_PAINT_MS ||
            metrics.CUMULATIVE_LAYOUT_SHIFT_SCORE ||
            metrics.INTERACTION_TO_NEXT_PAINT ||
            metrics.EXPERIMENTAL_INTERACTION_TO_NEXT_PAINT
        );
    });

    if (!chosen) {
        return {
            source: null,
            lcp: null,
            cls: null,
            inp: null
        };
    }

    const metrics = chosen.metrics || {};

    return {
        source: chosen.source,
        lcp: pickMetric(metrics, 'LARGEST_CONTENTFUL_PAINT_MS', false),
        cls: pickMetric(metrics, 'CUMULATIVE_LAYOUT_SHIFT_SCORE', true),
        inp: pickMetric(metrics, 'INTERACTION_TO_NEXT_PAINT', false) || pickMetric(metrics, 'EXPERIMENTAL_INTERACTION_TO_NEXT_PAINT', false)
    };
}

function pickMetric(metrics, key, normalizeCls) {
    const metric = metrics?.[key];
    if (!metric || typeof metric !== 'object' || metric.percentile == null) {
        return null;
    }

    let percentile = metric.percentile;
    if (normalizeCls) {
        percentile = normalizeClsPercentile(percentile);
    }

    return {
        percentile,
        category: metric.category || null
    };
}

function normalizeClsPercentile(value) {
    if (typeof value !== 'number') {
        return null;
    }

    if (value > 1) {
        return Number((value / 100).toFixed(2));
    }

    return Number(value.toFixed(2));
}

function generateTopFixes(strategyResults) {
    const byRecommendation = new Map();

    strategyResults.forEach((strategyEntry) => {
        const strategy = strategyEntry.strategy;
        const audits = strategyEntry?.lighthouseResult?.audits || {};

        Object.entries(audits).forEach(([auditId, audit]) => {
            if (!isActionableAudit(audit)) {
                return;
            }

            const recommendation = recommendationFromAudit(auditId, audit.title);
            const impactScore = estimateImpact(audit, strategy);
            const existing = byRecommendation.get(recommendation);

            if (!existing || impactScore > existing.impactScore) {
                byRecommendation.set(recommendation, {
                    recommendation,
                    impactScore
                });
            }
        });
    });

    const ranked = Array.from(byRecommendation.values())
        .sort((a, b) => b.impactScore - a.impactScore)
        .slice(0, 5)
        .map((entry) => entry.recommendation);

    if (ranked.length < 5) {
        FALLBACK_FIXES.forEach((fallback) => {
            if (ranked.length < 5 && !ranked.includes(fallback)) {
                ranked.push(fallback);
            }
        });
    }

    return ranked;
}

function isActionableAudit(audit) {
    if (!audit || typeof audit !== 'object') {
        return false;
    }

    const mode = audit.scoreDisplayMode;
    if (mode === 'notApplicable' || mode === 'manual' || mode === 'error' || mode === 'informative') {
        return false;
    }

    if (typeof audit.score !== 'number') {
        return false;
    }

    return audit.score < 0.9;
}

function recommendationFromAudit(auditId, title) {
    if (FIX_BY_AUDIT_ID[auditId]) {
        return FIX_BY_AUDIT_ID[auditId];
    }

    if (title && typeof title === 'string') {
        return `Address Lighthouse issue: ${title}.`;
    }

    return 'Address major Lighthouse opportunities to improve user experience and search performance.';
}

function estimateImpact(audit, strategy) {
    let score = 0;

    if (typeof audit?.details?.overallSavingsMs === 'number') {
        score += audit.details.overallSavingsMs / 100;
    }

    if (typeof audit?.details?.overallSavingsBytes === 'number') {
        score += audit.details.overallSavingsBytes / 25000;
    }

    if (typeof audit?.numericValue === 'number' && audit.numericValue > 0) {
        score += audit.numericValue / 1000;
    }

    if (typeof audit?.score === 'number') {
        score += (1 - audit.score) * 100;
    }

    const strategyMultiplier = strategy === 'mobile' ? 1.25 : 1.0;
    return (score || 1) * strategyMultiplier;
}

async function runExtraChecks(normalizedUrl) {
    const origin = normalizedUrl.origin;
    const homepageUrl = `${origin}/`;

    const [httpRedirectCheck, homepageHtml, sitemapCheck, robotsCheck] = await Promise.all([
        checkHttpRedirectToHttps(normalizedUrl),
        fetchHomepageHtml(homepageUrl),
        checkPathExists(origin, '/sitemap.xml'),
        checkPathExists(origin, '/robots.txt')
    ]);

    const titlePresent = homepageHtml.success ? hasTitle(homepageHtml.html) : false;
    const metaDescriptionPresent = homepageHtml.success ? hasMetaDescription(homepageHtml.html) : false;
    const httpsPresent = normalizedUrl.protocol === 'https:';

    return [
        {
            id: 'https_present',
            label: 'HTTPS is enabled',
            passed: httpsPresent,
            recommendation: httpsPresent
                ? 'HTTPS is enabled.'
                : 'Enable HTTPS and serve all traffic over TLS.'
        },
        {
            id: 'http_redirects_to_https',
            label: 'HTTP redirects to HTTPS',
            passed: httpRedirectCheck.passed,
            recommendation: httpRedirectCheck.passed
                ? 'HTTP requests are redirected to HTTPS.'
                : 'Add a 301 redirect from HTTP to HTTPS for all paths.'
        },
        {
            id: 'title_tag_present',
            label: 'Homepage has a title tag',
            passed: titlePresent,
            recommendation: titlePresent
                ? 'Homepage title tag is present.'
                : 'Add a clear homepage <title> tag that includes your main keyword.'
        },
        {
            id: 'meta_description_present',
            label: 'Homepage has a meta description',
            passed: metaDescriptionPresent,
            recommendation: metaDescriptionPresent
                ? 'Homepage meta description is present.'
                : 'Add a concise homepage meta description for better search snippets.'
        },
        {
            id: 'sitemap_exists',
            label: '/sitemap.xml is reachable',
            passed: sitemapCheck.passed,
            recommendation: sitemapCheck.passed
                ? '/sitemap.xml is reachable.'
                : 'Publish /sitemap.xml and keep it updated with your core URLs.'
        },
        {
            id: 'robots_exists',
            label: '/robots.txt is reachable',
            passed: robotsCheck.passed,
            recommendation: robotsCheck.passed
                ? '/robots.txt is reachable.'
                : 'Publish /robots.txt with crawl rules and a sitemap reference.'
        }
    ];
}

async function checkHttpRedirectToHttps(normalizedUrl) {
    const httpUrl = new URL(normalizedUrl.toString());
    httpUrl.protocol = 'http:';

    try {
        const response = await fetchWithTimeout(httpUrl.toString(), {
            method: 'GET',
            redirect: 'manual'
        }, 9000);

        const status = response.status;
        const location = response.headers.get('location') || '';
        const passed = [301, 302, 307, 308].includes(status) && location.startsWith('https://');

        return {
            passed,
            status,
            location
        };
    } catch (error) {
        return {
            passed: false,
            status: null,
            location: null
        };
    }
}

async function fetchHomepageHtml(url) {
    try {
        const response = await fetchWithTimeout(url, {
            method: 'GET',
            redirect: 'follow',
            headers: {
                'User-Agent': 'AnchorWebCoHealthCheck/1.0'
            }
        }, 10000);

        if (!response.ok) {
            return { success: false, html: '' };
        }

        const html = await response.text();
        return { success: true, html: html.slice(0, 300000) };
    } catch (error) {
        return { success: false, html: '' };
    }
}

function hasTitle(html) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return Boolean(titleMatch && titleMatch[1] && titleMatch[1].trim());
}

function hasMetaDescription(html) {
    const metaTags = html.match(/<meta[^>]*>/gi) || [];

    return metaTags.some((tag) => {
        const nameMatch = tag.match(/name\s*=\s*['\"]description['\"]/i);
        if (!nameMatch) {
            return false;
        }

        const contentMatch = tag.match(/content\s*=\s*['\"]([^'\"]+)['\"]/i);
        return Boolean(contentMatch && contentMatch[1] && contentMatch[1].trim());
    });
}

async function checkPathExists(origin, path) {
    const url = `${origin}${path}`;

    try {
        let response = await fetchWithTimeout(url, {
            method: 'HEAD',
            redirect: 'follow'
        }, 7000);

        if (response.status === 405 || response.status === 403) {
            response = await fetchWithTimeout(url, {
                method: 'GET',
                redirect: 'follow'
            }, 7000);
        }

        return {
            passed: response.status === 200,
            status: response.status
        };
    } catch (error) {
        return {
            passed: false,
            status: null
        };
    }
}

async function enforceRateLimit(sourceIp) {
    const tableName = process.env.RATE_LIMIT_TABLE_NAME;
    if (!tableName) {
        return;
    }

    const windowSeconds = Number(process.env.RATE_LIMIT_WINDOW_SECONDS || 3600);
    const maxRequests = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 10);

    const now = Math.floor(Date.now() / 1000);
    const windowKey = `${sourceIp}#${Math.floor(now / windowSeconds)}`;
    const ttl = now + windowSeconds;

    try {
        await dynamoClient.send(new UpdateCommand({
            TableName: tableName,
            Key: { ip_window: windowKey },
            UpdateExpression: 'SET updated_at = :updatedAt, expires_at = :ttl ADD request_count :inc',
            ConditionExpression: 'attribute_not_exists(request_count) OR request_count < :maxRequests',
            ExpressionAttributeValues: {
                ':updatedAt': new Date().toISOString(),
                ':ttl': ttl,
                ':inc': 1,
                ':maxRequests': maxRequests
            }
        }));
    } catch (error) {
        if (error?.name === 'ConditionalCheckFailedException') {
            throw httpError(429, 'Rate limit exceeded. Please try again later.');
        }

        throw error;
    }
}

async function saveRun(reportPayload, email) {
    const tableName = process.env.RUNS_TABLE_NAME;
    if (!tableName) {
        return false;
    }

    const item = {
        run_id: reportPayload.run_id,
        created_at: reportPayload.created_at,
        website_url: reportPayload.website_url,
        email: email || null,
        overall_score: reportPayload.overall_score,
        category_scores: reportPayload.category_scores,
        strategy_scores: reportPayload.strategy_scores,
        mobile_score: reportPayload.mobile_score,
        desktop_score: reportPayload.desktop_score,
        core_web_vitals: summarizeCoreWebVitals(reportPayload.core_web_vitals),
        top_fixes: reportPayload.top_fixes,
        extra_checks: reportPayload.extra_checks.map((check) => ({
            id: check.id,
            label: check.label,
            passed: check.passed
        }))
    };

    try {
        await dynamoClient.send(new PutCommand({
            TableName: tableName,
            Item: item
        }));
        return true;
    } catch (error) {
        console.error('Failed to save health-check run:', error);
        return false;
    }
}

function summarizeCoreWebVitals(coreWebVitals) {
    if (!coreWebVitals) {
        return null;
    }

    return {
        source: coreWebVitals.source,
        lcp: coreWebVitals.lcp ? coreWebVitals.lcp.percentile : null,
        cls: coreWebVitals.cls ? coreWebVitals.cls.percentile : null,
        inp: coreWebVitals.inp ? coreWebVitals.inp.percentile : null
    };
}

async function sendReportEmail(recipientEmail, reportPayload) {
    const senderEmail = process.env.SES_FROM_EMAIL;
    if (!senderEmail) {
        return false;
    }

    const subject = 'Your Website Health Check Report';
    const html = buildEmailHtml(reportPayload);
    const text = buildEmailText(reportPayload);

    try {
        await sesClient.send(new SendEmailCommand({
            FromEmailAddress: senderEmail,
            Destination: {
                ToAddresses: [recipientEmail]
            },
            Content: {
                Simple: {
                    Subject: {
                        Data: subject
                    },
                    Body: {
                        Html: {
                            Data: html
                        },
                        Text: {
                            Data: text
                        }
                    }
                }
            }
        }));
        return true;
    } catch (error) {
        console.error('Failed to send report email:', error);
        return false;
    }
}

function buildEmailHtml(reportPayload) {
    const category = reportPayload.category_scores || {};
    const fixes = (reportPayload.top_fixes || []).map((fix) => `<li>${escapeHtml(fix)}</li>`).join('');

    return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your Website Health Check Report</title>
</head>
<body style="font-family:Arial,sans-serif;background:#f8fafc;color:#0f172a;margin:0;padding:24px;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
    <tr>
      <td style="background:#1f2937;color:#fff;padding:20px 24px;">
        <h1 style="margin:0;font-size:24px;">Your Website Health Check Report</h1>
        <p style="margin:8px 0 0 0;font-size:14px;color:#cbd5e1;">${escapeHtml(reportPayload.website_url)}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 24px;">
        <p style="margin:0 0 16px 0;font-size:16px;"><strong>Overall Score:</strong> ${reportPayload.overall_score}/100</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;border-collapse:collapse;">
          <tr>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;">Performance</td>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;" align="right">${category.performance || 0}/100</td>
          </tr>
          <tr>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;">SEO</td>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;" align="right">${category.seo || 0}/100</td>
          </tr>
          <tr>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;">Best Practices</td>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;" align="right">${category.best_practices || 0}/100</td>
          </tr>
          <tr>
            <td style="padding:8px;">Accessibility</td>
            <td style="padding:8px;" align="right">${category.accessibility || 0}/100</td>
          </tr>
        </table>

        <h2 style="font-size:18px;margin:24px 0 8px 0;">Top 5 Fixes</h2>
        <ol style="padding-left:20px;margin:0;color:#334155;">${fixes}</ol>

        <p style="margin:24px 0 0 0;font-size:14px;color:#334155;">Want help fixing these quickly? We can do it for you.</p>
        <p style="margin:12px 0 0 0;"><a href="https://www.anchorwebco.com.au/contact.html" style="display:inline-block;background:#0ea5e9;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:bold;">Contact Anchor Web Co</a></p>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

function buildEmailText(reportPayload) {
    const category = reportPayload.category_scores || {};
    const fixes = (reportPayload.top_fixes || []).map((fix, index) => `${index + 1}. ${fix}`).join('\n');

    return [
        'Your Website Health Check Report',
        '',
        `Website: ${reportPayload.website_url}`,
        `Overall Score: ${reportPayload.overall_score}/100`,
        '',
        `Performance: ${category.performance || 0}/100`,
        `SEO: ${category.seo || 0}/100`,
        `Best Practices: ${category.best_practices || 0}/100`,
        `Accessibility: ${category.accessibility || 0}/100`,
        '',
        'Top 5 Fixes:',
        fixes,
        '',
        'Need help implementing fixes?',
        'Contact Anchor Web Co: https://www.anchorwebco.com.au/contact.html'
    ].join('\n');
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        return response;
    } finally {
        clearTimeout(timeout);
    }
}

function getHeader(event, headerName) {
    const headers = event?.headers || {};
    const lowerCaseHeader = headerName.toLowerCase();

    for (const [key, value] of Object.entries(headers)) {
        if (key.toLowerCase() === lowerCaseHeader) {
            return value;
        }
    }

    return null;
}

function resolveCorsOrigin(requestOrigin) {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

    if (!requestOrigin) {
        return allowedOrigins[0] || '*';
    }

    if (allowedOrigins.length === 0) {
        return '*';
    }

    if (allowedOrigins.includes('*')) {
        return '*';
    }

    if (allowedOrigins.includes(requestOrigin)) {
        return requestOrigin;
    }

    return null;
}

function buildCorsHeaders(corsOrigin) {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Cache-Control': 'no-store',
        'Vary': 'Origin'
    };

    if (corsOrigin) {
        headers['Access-Control-Allow-Origin'] = corsOrigin;
    }

    return headers;
}

function getSourceIp(event) {
    const fromRequestContext = event?.requestContext?.http?.sourceIp;
    if (fromRequestContext) {
        return fromRequestContext;
    }

    const forwardedFor = getHeader(event, 'x-forwarded-for');
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }

    return 'unknown';
}

function jsonResponse(statusCode, body, corsOrigin) {
    return {
        statusCode,
        headers: buildCorsHeaders(corsOrigin),
        body: JSON.stringify(body)
    };
}

function httpError(statusCode, message) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}
