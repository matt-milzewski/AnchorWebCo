'use strict';

const { randomUUID } = require('crypto');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const {
    SESv2Client,
    SendEmailCommand,
    GetAccountCommand,
    GetEmailIdentityCommand
} = require('@aws-sdk/client-sesv2');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const ssmClient = new SSMClient({});
const sesClient = new SESv2Client({});
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
    marshallOptions: {
        removeUndefinedValues: true
    }
});

const defaultRuntimeDeps = {
    randomUUIDFn: randomUUID,
    ssmClient,
    sesClient,
    dynamoClient,
    fetchFn: (...args) => fetch(...args)
};

const runtimeDeps = { ...defaultRuntimeDeps };

const SCORE_WEIGHTS = {
    performance: 0.5,
    seo: 0.25,
    best_practices: 0.15,
    accessibility: 0.1
};

const FALLBACK_SCORE_CAPS = {
    performance: 85,
    seo: 100,
    best_practices: 95,
    accessibility: 90
};

const FALLBACK_FIXES = [
    'Compress large images and serve next-gen formats such as WebP or AVIF.',
    'Reduce unused JavaScript and CSS so pages render faster.',
    'Set explicit width and height for media to prevent layout shifts.',
    'Improve above-the-fold content loading to lower LCP.',
    'Tighten metadata and heading structure for stronger SEO signals.'
];

const FALLBACK_PASSING_NEXT_STEPS = [
    'Connect a working PageSpeed Insights API key when available to restore Lighthouse and Core Web Vitals scoring.',
    'Keep monitoring the site after adding new images, scripts, booking tools, or tracking tags.',
    'Review the main conversion path manually to confirm visitors can quickly call, email, or submit an enquiry.',
    'Check Google Search Console for search queries and indexing issues that are not visible in a server-side audit.',
    'Run the audit again after any major content, SEO, or design change.'
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
let cachedSesAccount = null;
const cachedSesIdentityStatus = new Map();

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

        if (!email) {
            throw httpError(400, 'email is required to receive your report.');
        }

        if (!emailConsent) {
            throw httpError(400, 'Please provide consent to email the report.');
        }

        const sourceIp = getSourceIp(event);
        await enforceRateLimit(sourceIp);

        const recipientValidation = await validateRecipientCanReceiveEmail(email);
        if (!recipientValidation.ok) {
            throw httpError(400, recipientValidation.message);
        }

        const apiKey = await getPageSpeedApiKey();

        const [pageSpeedChecks, extraChecks] = await Promise.all([
            runPageSpeedChecks(normalizedUrl.toString(), apiKey),
            runExtraChecks(normalizedUrl)
        ]);

        const mobileResult = pageSpeedChecks.mobile;
        const desktopResult = pageSpeedChecks.desktop;
        const pageSpeedStrategyResults = [
            mobileResult ? { strategy: 'mobile', lighthouseResult: mobileResult?.lighthouseResult } : null,
            desktopResult ? { strategy: 'desktop', lighthouseResult: desktopResult?.lighthouseResult } : null
        ].filter(Boolean);
        const useFallbackScores = pageSpeedStrategyResults.length === 0;
        const fallbackCategoryScores = useFallbackScores ? computeFallbackCategoryScores(extraChecks) : null;

        const mobileCategoryScores = useFallbackScores
            ? fallbackCategoryScores
            : (mobileResult ? extractCategoryScores(mobileResult?.lighthouseResult) : emptyCategoryScores());
        const desktopCategoryScores = useFallbackScores
            ? fallbackCategoryScores
            : (desktopResult ? extractCategoryScores(desktopResult?.lighthouseResult) : emptyCategoryScores());

        const categoryScores = useFallbackScores
            ? fallbackCategoryScores
            : averageCategoryScoreSet(
                [mobileResult ? mobileCategoryScores : null, desktopResult ? desktopCategoryScores : null].filter(Boolean)
            );
        const overallScore = computeOverallScore(categoryScores);
        const coreWebVitals = extractCoreWebVitals(mobileResult, desktopResult);
        const topFixes = pageSpeedStrategyResults.length > 0
            ? generateTopFixes(pageSpeedStrategyResults)
            : generateTopFixesFromExtraChecks(extraChecks);

        const runId = runtimeDeps.randomUUIDFn();
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
            score_source: useFallbackScores ? 'anchor-fallback' : 'pagespeed',
            email_sent: false,
            lead_notification_sent: false,
            saved: false,
            warnings: [...pageSpeedChecks.warnings]
        };

        if (useFallbackScores) {
            reportPayload.warnings.push('Google PageSpeed was temporarily unavailable, so this report uses Anchor Web Co fallback scoring from server-side technical checks.');
            reportPayload.warnings.push('Fallback scores are capped because server-side checks cannot fully measure Lighthouse lab performance or Core Web Vitals.');
        }

        reportPayload.saved = await saveRun(reportPayload, email);

        const reportEmailResult = await sendReportEmail(email, reportPayload);
        reportPayload.email_sent = reportEmailResult.sent;
        if (!reportEmailResult.sent) {
            throw httpError(reportEmailResult.statusCode || 502, reportEmailResult.message || 'We could not send your report email right now. Please try again shortly.');
        }

        reportPayload.lead_notification_sent = await sendLeadNotificationEmail(email, reportPayload);
        if (!reportPayload.lead_notification_sent) {
            reportPayload.warnings.push('Lead notification email was not delivered.');
        }

        if (!reportPayload.saved) {
            reportPayload.warnings.push('Report storage is not configured or failed.');
        }

        reportPayload.message = 'Success. Your report is being emailed now. Please check your inbox in the next minute.';

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

async function validateRecipientCanReceiveEmail(email) {
    const senderEmail = (process.env.SES_FROM_EMAIL || '').trim();
    if (!senderEmail) {
        return {
            ok: false,
            message: 'Report email delivery is not configured right now.'
        };
    }

    let account;
    try {
        account = await getSesAccount();
    } catch (error) {
        console.warn('Unable to verify SES account status before sending report email:', error);
        return { ok: true };
    }

    if (account?.ProductionAccessEnabled) {
        return { ok: true };
    }

    const normalizedEmail = email.trim().toLowerCase();
    const domain = normalizedEmail.includes('@') ? normalizedEmail.split('@')[1] : '';

    const emailIdentityVerified = await isSesIdentityVerifiedForSending(normalizedEmail);
    if (emailIdentityVerified) {
        return { ok: true };
    }

    if (domain) {
        const domainIdentityVerified = await isSesIdentityVerifiedForSending(domain);
        if (domainIdentityVerified) {
            return { ok: true };
        }
    }

    return {
        ok: false,
        message: 'We can currently send reports only to verified email addresses. Please contact us if you need help.'
    };
}

async function getSesAccount() {
    if (cachedSesAccount) {
        return cachedSesAccount;
    }

    const account = await runtimeDeps.sesClient.send(new GetAccountCommand({}));
    cachedSesAccount = account;
    return account;
}

async function isSesIdentityVerifiedForSending(identity) {
    const normalizedIdentity = String(identity || '').trim().toLowerCase();
    if (!normalizedIdentity) {
        return false;
    }

    if (cachedSesIdentityStatus.has(normalizedIdentity)) {
        return cachedSesIdentityStatus.get(normalizedIdentity);
    }

    let verified = false;

    try {
        const response = await runtimeDeps.sesClient.send(new GetEmailIdentityCommand({
            EmailIdentity: normalizedIdentity
        }));

        verified =
            response?.VerificationStatus === 'SUCCESS' &&
            response?.SendingEnabled !== false;
    } catch (error) {
        if (error?.name !== 'NotFoundException') {
            console.warn(`SES identity lookup failed for ${normalizedIdentity}:`, error);
        }
        verified = false;
    }

    if (cachedSesIdentityStatus.size < 200) {
        cachedSesIdentityStatus.set(normalizedIdentity, verified);
    }

    return verified;
}

async function getPageSpeedApiKey() {
    if (cachedPageSpeedApiKey) {
        return cachedPageSpeedApiKey;
    }

    const paramName = process.env.PAGESPEED_API_KEY_PARAM;
    if (!paramName) {
        throw httpError(500, 'PageSpeed API key parameter is not configured.');
    }

    const response = await runtimeDeps.ssmClient.send(new GetParameterCommand({
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
    try {
        return await runPageSpeedRequest(targetUrl, strategy, apiKey);
    } catch (error) {
        if (apiKey && isPageSpeedApiKeyServiceBlocked(error)) {
            console.warn('PageSpeed API key is blocked for the service, retrying without an API key.', {
                strategy,
                upstreamStatus: error.upstreamStatus
            });
            return runPageSpeedRequest(targetUrl, strategy, '');
        }

        throw error;
    }
}

async function runPageSpeedRequest(targetUrl, strategy, apiKey) {
    const url = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
    url.searchParams.set('url', targetUrl);
    url.searchParams.set('strategy', strategy);
    if (apiKey) {
        url.searchParams.set('key', apiKey);
    }

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
        const error = httpError(502, `Google PageSpeed request failed for ${strategy}.`);
        error.upstreamStatus = response.status;
        error.upstreamBody = await readLimitedResponseText(response, 1200);
        throw error;
    }

    const payload = await response.json();

    if (!payload?.lighthouseResult?.categories) {
        throw httpError(502, `Google PageSpeed response for ${strategy} was incomplete.`);
    }

    return payload;
}

function isPageSpeedApiKeyServiceBlocked(error) {
    return error?.upstreamStatus === 403 && /API_KEY_SERVICE_BLOCKED|blocked/i.test(error?.upstreamBody || '');
}

async function runPageSpeedChecks(targetUrl, apiKey) {
    const checks = await Promise.allSettled([
        runPageSpeed(targetUrl, 'mobile', apiKey),
        runPageSpeed(targetUrl, 'desktop', apiKey)
    ]);

    const result = {
        mobile: null,
        desktop: null,
        warnings: []
    };

    const strategies = ['mobile', 'desktop'];
    checks.forEach((check, index) => {
        const strategy = strategies[index];

        if (check.status === 'fulfilled') {
            result[strategy] = check.value;
            return;
        }

        const error = check.reason;
        console.warn('PageSpeed check failed:', {
            strategy,
            message: error?.message,
            upstreamStatus: error?.upstreamStatus,
            upstreamBody: error?.upstreamBody
        });
        result.warnings.push(`Google PageSpeed ${strategy} data was unavailable for this run.`);
    });

    const failures = checks.filter((check) => check.status === 'rejected');
    const successes = checks.length - failures.length;
    const allTimedOut = failures.length === checks.length && failures.every((check) => check.reason?.name === 'AbortError');
    if (successes === 0 && allTimedOut) {
        throw failures[0].reason;
    }

    return result;
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

function emptyCategoryScores() {
    return {
        performance: 0,
        seo: 0,
        best_practices: 0,
        accessibility: 0
    };
}

function scoreToHundred(value) {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        return 0;
    }

    return Math.max(0, Math.min(100, Math.round(value * 100)));
}

function averageCategoryScoreSet(scoreSet) {
    if (!scoreSet.length) {
        return emptyCategoryScores();
    }

    return {
        performance: averageMany(scoreSet.map((scores) => scores.performance)),
        seo: averageMany(scoreSet.map((scores) => scores.seo)),
        best_practices: averageMany(scoreSet.map((scores) => scores.best_practices)),
        accessibility: averageMany(scoreSet.map((scores) => scores.accessibility))
    };
}

function averageMany(values) {
    const numericValues = values
        .map((value) => Number(value || 0))
        .filter((value) => Number.isFinite(value));

    if (!numericValues.length) {
        return 0;
    }

    return Math.round(numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length);
}

function computeFallbackCategoryScores(extraChecks) {
    const categories = ['performance', 'seo', 'best_practices', 'accessibility'];
    const scores = {};

    categories.forEach((category) => {
        const checks = (extraChecks || []).filter((check) => check.category === category);
        const totalWeight = checks.reduce((sum, check) => sum + Number(check.weight || 1), 0);
        const passedWeight = checks.reduce((sum, check) => sum + (check.passed ? Number(check.weight || 1) : 0), 0);
        const rawScore = totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 0;
        scores[category] = Math.min(rawScore, FALLBACK_SCORE_CAPS[category] || 100);
    });

    return scores;
}

function generateTopFixesFromExtraChecks(extraChecks) {
    const fixes = (extraChecks || [])
        .filter((check) => !check.passed && check.recommendation)
        .sort((a, b) => Number(b.weight || 1) - Number(a.weight || 1))
        .map((check) => check.recommendation);

    if (!fixes.length) {
        return FALLBACK_PASSING_NEXT_STEPS.slice(0, 5);
    }

    FALLBACK_FIXES.forEach((fallback) => {
        if (fixes.length < 5 && !fixes.includes(fallback)) {
            fixes.push(fallback);
        }
    });

    return fixes.slice(0, 5);
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
    const viewportPresent = homepageHtml.success ? hasViewportMeta(homepageHtml.html) : false;
    const canonicalPresent = homepageHtml.success ? hasCanonicalLink(homepageHtml.html) : false;
    const h1Present = homepageHtml.success ? hasH1(homepageHtml.html) : false;
    const langPresent = homepageHtml.success ? hasHtmlLang(homepageHtml.html) : false;
    const imageAltCoverage = homepageHtml.success ? getImageAltCoverage(homepageHtml.html) : { total: 0, withAlt: 0, passed: true };
    const htmlSizeBytes = homepageHtml.html_size_bytes || 0;
    const htmlSizeReasonable = homepageHtml.success && htmlSizeBytes > 0 && htmlSizeBytes <= 200000;
    const responseFast = homepageHtml.success && homepageHtml.duration_ms <= 1500;
    const textHtml = homepageHtml.success && /^text\/html\b/i.test(homepageHtml.content_type || '');
    const compressionPresent = homepageHtml.compressed === true || htmlSizeBytes <= 75000;
    const httpsPresent = normalizedUrl.protocol === 'https:';

    return [
        {
            id: 'https_present',
            label: 'HTTPS is enabled',
            category: 'best_practices',
            weight: 2,
            passed: httpsPresent,
            recommendation: httpsPresent
                ? 'HTTPS is enabled.'
                : 'Enable HTTPS and serve all traffic over TLS.'
        },
        {
            id: 'http_redirects_to_https',
            label: 'HTTP redirects to HTTPS',
            category: 'best_practices',
            weight: 1,
            passed: httpRedirectCheck.passed,
            recommendation: httpRedirectCheck.passed
                ? 'HTTP requests are redirected to HTTPS.'
                : 'Add a 301 redirect from HTTP to HTTPS for all paths.'
        },
        {
            id: 'homepage_response_fast',
            label: 'Homepage responds quickly',
            category: 'performance',
            weight: 2,
            passed: responseFast,
            recommendation: responseFast
                ? `Homepage responded in ${homepageHtml.duration_ms}ms.`
                : 'Improve hosting, caching, or upstream redirects so the homepage responds faster.'
        },
        {
            id: 'html_size_reasonable',
            label: 'Homepage HTML weight is reasonable',
            category: 'performance',
            weight: 1,
            passed: htmlSizeReasonable,
            recommendation: htmlSizeReasonable
                ? `Homepage HTML is ${formatBytes(htmlSizeBytes)}.`
                : 'Reduce heavy inline HTML, scripts, and embedded content on the homepage.'
        },
        {
            id: 'text_compression_or_small_html',
            label: 'HTML is compressed or lightweight',
            category: 'performance',
            weight: 1,
            passed: compressionPresent,
            recommendation: compressionPresent
                ? 'HTML response is compressed or already lightweight.'
                : 'Enable Brotli/Gzip compression for text responses.'
        },
        {
            id: 'title_tag_present',
            label: 'Homepage has a title tag',
            category: 'seo',
            weight: 2,
            passed: titlePresent,
            recommendation: titlePresent
                ? 'Homepage title tag is present.'
                : 'Add a clear homepage <title> tag that includes your main keyword.'
        },
        {
            id: 'meta_description_present',
            label: 'Homepage has a meta description',
            category: 'seo',
            weight: 1,
            passed: metaDescriptionPresent,
            recommendation: metaDescriptionPresent
                ? 'Homepage meta description is present.'
                : 'Add a concise homepage meta description for better search snippets.'
        },
        {
            id: 'viewport_meta_present',
            label: 'Mobile viewport tag is present',
            category: 'accessibility',
            weight: 2,
            passed: viewportPresent,
            recommendation: viewportPresent
                ? 'Mobile viewport tag is present.'
                : 'Add a viewport meta tag so mobile browsers render the page correctly.'
        },
        {
            id: 'canonical_link_present',
            label: 'Canonical URL is present',
            category: 'seo',
            weight: 1,
            passed: canonicalPresent,
            recommendation: canonicalPresent
                ? 'Canonical URL is present.'
                : 'Add a canonical link to help search engines understand the preferred homepage URL.'
        },
        {
            id: 'h1_present',
            label: 'Homepage has an H1',
            category: 'seo',
            weight: 1,
            passed: h1Present,
            recommendation: h1Present
                ? 'Homepage H1 is present.'
                : 'Add one clear H1 that explains the business and primary service.'
        },
        {
            id: 'html_lang_present',
            label: 'HTML language is declared',
            category: 'accessibility',
            weight: 1,
            passed: langPresent,
            recommendation: langPresent
                ? 'HTML language is declared.'
                : 'Add a lang attribute to the html tag for accessibility and translation tools.'
        },
        {
            id: 'image_alt_coverage',
            label: 'Images have alt text',
            category: 'accessibility',
            weight: 1,
            passed: imageAltCoverage.passed,
            recommendation: imageAltCoverage.passed
                ? `${imageAltCoverage.withAlt}/${imageAltCoverage.total} images have alt text or no image alt issues were found.`
                : `Add alt text to important images. ${imageAltCoverage.withAlt}/${imageAltCoverage.total} images currently have alt text.`
        },
        {
            id: 'homepage_serves_html',
            label: 'Homepage serves HTML correctly',
            category: 'best_practices',
            weight: 1,
            passed: textHtml,
            recommendation: textHtml
                ? 'Homepage serves a text/html response.'
                : 'Ensure the homepage returns a normal text/html response.'
        },
        {
            id: 'sitemap_exists',
            label: '/sitemap.xml is reachable',
            category: 'seo',
            weight: 1,
            passed: sitemapCheck.passed,
            recommendation: sitemapCheck.passed
                ? '/sitemap.xml is reachable.'
                : 'Publish /sitemap.xml and keep it updated with your core URLs.'
        },
        {
            id: 'robots_exists',
            label: '/robots.txt is reachable',
            category: 'seo',
            weight: 1,
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
        const startedAt = Date.now();
        const response = await fetchWithTimeout(url, {
            method: 'GET',
            redirect: 'follow',
            headers: {
                'User-Agent': 'AnchorWebCoHealthCheck/1.0'
            }
        }, 10000);
        const durationMs = Date.now() - startedAt;

        if (!response.ok) {
            return {
                success: false,
                html: '',
                duration_ms: durationMs,
                status: response.status,
                content_type: response.headers.get('content-type') || '',
                compressed: false,
                html_size_bytes: 0
            };
        }

        const html = await response.text();
        const contentEncoding = response.headers.get('content-encoding') || '';
        return {
            success: true,
            html: html.slice(0, 300000),
            duration_ms: durationMs,
            status: response.status,
            content_type: response.headers.get('content-type') || '',
            compressed: Boolean(contentEncoding),
            html_size_bytes: Buffer.byteLength(html, 'utf8')
        };
    } catch (error) {
        return {
            success: false,
            html: '',
            duration_ms: null,
            status: null,
            content_type: '',
            compressed: false,
            html_size_bytes: 0
        };
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

function hasViewportMeta(html) {
    const metaTags = html.match(/<meta[^>]*>/gi) || [];
    return metaTags.some((tag) => /name\s*=\s*['"]viewport['"]/i.test(tag));
}

function hasCanonicalLink(html) {
    const linkTags = html.match(/<link[^>]*>/gi) || [];
    return linkTags.some((tag) => /rel\s*=\s*['"]canonical['"]/i.test(tag) && /href\s*=/i.test(tag));
}

function hasH1(html) {
    return /<h1\b[^>]*>[\s\S]*?<\/h1>/i.test(html);
}

function hasHtmlLang(html) {
    const htmlTag = html.match(/<html[^>]*>/i);
    return Boolean(htmlTag && /\slang\s*=\s*['"][^'"]+['"]/i.test(htmlTag[0]));
}

function getImageAltCoverage(html) {
    const imageTags = html.match(/<img\b[^>]*>/gi) || [];
    if (!imageTags.length) {
        return {
            total: 0,
            withAlt: 0,
            passed: true
        };
    }

    const withAlt = imageTags.filter((tag) => /\salt\s*=\s*['"][^'"]*['"]/i.test(tag)).length;
    const coverage = withAlt / imageTags.length;

    return {
        total: imageTags.length,
        withAlt,
        passed: coverage >= 0.9
    };
}

function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) {
        return '0 KB';
    }

    if (bytes < 1024) {
        return `${bytes} B`;
    }

    return `${Math.round(bytes / 1024)} KB`;
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
        await runtimeDeps.dynamoClient.send(new UpdateCommand({
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
        score_source: reportPayload.score_source,
        core_web_vitals: summarizeCoreWebVitals(reportPayload.core_web_vitals),
        top_fixes: reportPayload.top_fixes,
        extra_checks: reportPayload.extra_checks.map((check) => ({
            id: check.id,
            label: check.label,
            passed: check.passed
        }))
    };

    try {
        await runtimeDeps.dynamoClient.send(new PutCommand({
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
        return {
            sent: false,
            statusCode: 502,
            message: 'Report email delivery is not configured right now.'
        };
    }

    const subject = 'Your Website Health Check Report';
    const html = buildEmailHtml(reportPayload);
    const text = buildEmailText(reportPayload);

    try {
        await runtimeDeps.sesClient.send(new SendEmailCommand({
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
        return { sent: true };
    } catch (error) {
        console.error('Failed to send report email:', error);

        if (isSesRecipientNotVerifiedError(error)) {
            return {
                sent: false,
                statusCode: 400,
                message: 'We can currently send reports only to verified email addresses. Please contact us if you need help.'
            };
        }

        return {
            sent: false,
            statusCode: 502,
            message: 'We could not send your report email right now. Please try again shortly.'
        };
    }
}

async function sendLeadNotificationEmail(prospectEmail, reportPayload) {
    const senderEmail = process.env.SES_FROM_EMAIL;
    const destinationEmail = (process.env.LEAD_NOTIFICATION_EMAIL || process.env.SES_FROM_EMAIL || '').trim();

    if (!senderEmail || !destinationEmail) {
        return false;
    }

    const subject = `New Website Health Check Lead: ${prospectEmail}`;
    const html = buildLeadNotificationHtml(prospectEmail, reportPayload);
    const text = buildLeadNotificationText(prospectEmail, reportPayload);

    try {
        await runtimeDeps.sesClient.send(new SendEmailCommand({
            FromEmailAddress: senderEmail,
            Destination: {
                ToAddresses: [destinationEmail]
            },
            ReplyToAddresses: [prospectEmail],
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
        console.error('Failed to send lead notification email:', error);
        return false;
    }
}

function buildEmailHtml(reportPayload) {
    const category = reportPayload.category_scores || {};
    const fixes = (reportPayload.top_fixes || []).map((fix) => `<li>${escapeHtml(fix)}</li>`).join('');
    const scoreSource = getScoreSourceLabel(reportPayload.score_source);
    const warnings = (reportPayload.warnings || [])
        .map((warning) => `<li>${escapeHtml(warning)}</li>`)
        .join('');

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
        <p style="margin:0 0 16px 0;font-size:13px;color:#64748b;"><strong>Score source:</strong> ${escapeHtml(scoreSource)}</p>
        ${warnings ? `<div style="margin:0 0 16px 0;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px;color:#9a3412;font-size:13px;"><strong>Notes:</strong><ul style="margin:8px 0 0 18px;padding:0;">${warnings}</ul></div>` : ''}
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
    const warnings = (reportPayload.warnings || []).map((warning) => `- ${warning}`).join('\n');

    return [
        'Your Website Health Check Report',
        '',
        `Website: ${reportPayload.website_url}`,
        `Overall Score: ${reportPayload.overall_score}/100`,
        `Score source: ${getScoreSourceLabel(reportPayload.score_source)}`,
        warnings ? `Notes:\n${warnings}` : '',
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

function buildLeadNotificationHtml(prospectEmail, reportPayload) {
    const category = reportPayload.category_scores || {};
    const fixes = (reportPayload.top_fixes || []).map((fix) => `<li>${escapeHtml(fix)}</li>`).join('');
    const warnings = (reportPayload.warnings || [])
        .map((warning) => `<li>${escapeHtml(warning)}</li>`)
        .join('');
    const extraChecks = (reportPayload.extra_checks || [])
        .map((check) => `<li>${escapeHtml(check.label)}: <strong>${check.passed ? 'Pass' : 'Needs work'}</strong></li>`)
        .join('');

    return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Website Health Check Lead</title>
</head>
<body style="font-family:Arial,sans-serif;background:#f8fafc;color:#0f172a;margin:0;padding:24px;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
    <tr>
      <td style="background:#1f2937;color:#fff;padding:20px 24px;">
        <h1 style="margin:0;font-size:22px;">New Website Health Check Lead</h1>
        <p style="margin:8px 0 0 0;font-size:14px;color:#cbd5e1;">Reply to: ${escapeHtml(prospectEmail)}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 24px;">
        <p style="margin:0 0 8px 0;"><strong>Lead Email:</strong> ${escapeHtml(prospectEmail)}</p>
        <p style="margin:0 0 8px 0;"><strong>Website:</strong> ${escapeHtml(reportPayload.website_url)}</p>
        <p style="margin:0 0 16px 0;"><strong>Overall Score:</strong> ${reportPayload.overall_score}/100</p>
        <p style="margin:0 0 16px 0;"><strong>Score Source:</strong> ${escapeHtml(getScoreSourceLabel(reportPayload.score_source))}</p>
        ${warnings ? `<h2 style="font-size:18px;margin:24px 0 8px 0;">Warnings</h2><ul style="padding-left:20px;margin:0;color:#9a3412;">${warnings}</ul>` : ''}

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

        <h2 style="font-size:18px;margin:24px 0 8px 0;">Extra Checks</h2>
        <ul style="padding-left:20px;margin:0;color:#334155;">${extraChecks}</ul>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

function buildLeadNotificationText(prospectEmail, reportPayload) {
    const category = reportPayload.category_scores || {};
    const fixes = (reportPayload.top_fixes || []).map((fix, index) => `${index + 1}. ${fix}`).join('\n');
    const warnings = (reportPayload.warnings || []).map((warning) => `- ${warning}`).join('\n');
    const extraChecks = (reportPayload.extra_checks || [])
        .map((check) => `- ${check.label}: ${check.passed ? 'Pass' : 'Needs work'}`)
        .join('\n');

    return [
        'New Website Health Check Lead',
        '',
        `Lead Email: ${prospectEmail}`,
        `Website: ${reportPayload.website_url}`,
        `Overall Score: ${reportPayload.overall_score}/100`,
        `Score Source: ${getScoreSourceLabel(reportPayload.score_source)}`,
        warnings ? `Warnings:\n${warnings}` : '',
        '',
        `Performance: ${category.performance || 0}/100`,
        `SEO: ${category.seo || 0}/100`,
        `Best Practices: ${category.best_practices || 0}/100`,
        `Accessibility: ${category.accessibility || 0}/100`,
        '',
        'Top 5 Fixes:',
        fixes,
        '',
        'Extra Checks:',
        extraChecks
    ].join('\n');
}

function getScoreSourceLabel(scoreSource) {
    if (scoreSource === 'anchor-fallback') {
        return 'Anchor Web Co fallback checks';
    }

    return 'Google PageSpeed Insights';
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function isSesRecipientNotVerifiedError(error) {
    if (!error) {
        return false;
    }

    const name = String(error.name || '');
    const message = String(error.message || '');

    return name === 'MessageRejected' && /email address is not verified/i.test(message);
}

async function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await runtimeDeps.fetchFn(url, {
            ...options,
            signal: controller.signal
        });
        return response;
    } finally {
        clearTimeout(timeout);
    }
}

async function readLimitedResponseText(response, limit) {
    try {
        const text = await response.text();
        return text.slice(0, limit);
    } catch (error) {
        return '';
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

function setRuntimeDependenciesForTests(overrides) {
    Object.assign(runtimeDeps, overrides || {});
}

function resetRuntimeDependenciesForTests() {
    Object.assign(runtimeDeps, defaultRuntimeDeps);
    resetCachedState();
}

function resetCachedState() {
    cachedPageSpeedApiKey = null;
    cachedSesAccount = null;
    cachedSesIdentityStatus.clear();
}

exports.__testing = {
    setRuntimeDependenciesForTests,
    resetRuntimeDependenciesForTests,
    resetCachedState
};
