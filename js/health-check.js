(function() {
    var form = document.getElementById('health-check-form');
    if (!form) {
        return;
    }

    var urlInput = document.getElementById('website-url');
    var emailInput = document.getElementById('health-email');
    var consentWrap = document.getElementById('email-consent-wrap');
    var consentCheckbox = document.getElementById('email-consent');
    var submitButton = document.getElementById('run-health-check-btn');
    var progressEl = document.getElementById('health-check-progress');
    var errorEl = document.getElementById('health-check-error');
    var resultsEl = document.getElementById('health-check-results');

    var overallScoreEl = document.getElementById('overall-score');
    var reportSummaryEl = document.getElementById('report-summary');
    var categoryCardsEl = document.getElementById('category-score-cards');
    var mobileScoreEl = document.getElementById('mobile-score');
    var desktopScoreEl = document.getElementById('desktop-score');
    var cwvEl = document.getElementById('core-web-vitals');
    var topFixesEl = document.getElementById('top-fixes');
    var extraChecksEl = document.getElementById('extra-checks');

    var progressTimer = null;
    var progressMessages = [
        'Validating your website URL...',
        'Running Google PageSpeed tests for mobile...',
        'Running Google PageSpeed tests for desktop...',
        'Compiling scores and recommendations...',
        'Finalizing your report...'
    ];

    function resolveApiUrl() {
        if (window.ANCHOR_HEALTH_CHECK_API_URL) {
            return String(window.ANCHOR_HEALTH_CHECK_API_URL).trim();
        }

        var base = window.ANCHOR_HEALTH_CHECK_API_BASE ? String(window.ANCHOR_HEALTH_CHECK_API_BASE).trim() : '';
        if (!base) {
            return '/api/health-check';
        }

        return base.replace(/\/$/, '') + '/api/health-check';
    }

    function showError(message) {
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
    }

    function clearError() {
        errorEl.textContent = '';
        errorEl.classList.add('hidden');
    }

    function updateConsentVisibility() {
        var hasEmail = emailInput.value.trim().length > 0;

        if (hasEmail) {
            consentWrap.classList.remove('hidden');
        } else {
            consentWrap.classList.add('hidden');
            consentCheckbox.checked = false;
        }
    }

    function normalizeUrl(inputValue) {
        var value = String(inputValue || '').trim();
        if (!value) {
            throw new Error('Please enter a website URL.');
        }

        var candidate = value;
        if (!/^https?:\/\//i.test(candidate)) {
            candidate = 'https://' + candidate;
        }

        var parsed;
        try {
            parsed = new URL(candidate);
        } catch (err) {
            throw new Error('Please enter a valid URL, for example https://example.com.');
        }

        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            throw new Error('URL must start with http:// or https://.');
        }

        parsed.hash = '';
        return parsed.toString();
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function startLoadingState() {
        var defaultLabel = submitButton.getAttribute('data-default-label') || 'Run Health Check';
        submitButton.setAttribute('data-default-label', defaultLabel);
        submitButton.textContent = 'Running Health Check...';
        submitButton.disabled = true;

        var index = 0;
        progressEl.textContent = progressMessages[index];
        progressTimer = setInterval(function() {
            index = (index + 1) % progressMessages.length;
            progressEl.textContent = progressMessages[index];
        }, 2800);
    }

    function stopLoadingState(message) {
        if (progressTimer) {
            clearInterval(progressTimer);
            progressTimer = null;
        }

        submitButton.textContent = submitButton.getAttribute('data-default-label') || 'Run Health Check';
        submitButton.disabled = false;
        progressEl.textContent = message || '';
    }

    function formatMetricValue(metricName, metricData) {
        if (!metricData || metricData.percentile == null) {
            return 'Not available';
        }

        var value = metricData.percentile;

        if (metricName === 'cls') {
            return Number(value).toFixed(2);
        }

        if (metricName === 'lcp' || metricName === 'inp') {
            return (Number(value) / 1000).toFixed(2) + 's';
        }

        return String(value);
    }

    function formatCategoryLabel(key) {
        var mapping = {
            performance: 'Performance',
            seo: 'SEO',
            best_practices: 'Best Practices',
            accessibility: 'Accessibility'
        };
        return mapping[key] || key;
    }

    function scorePill(score) {
        var numericScore = Number(score) || 0;
        if (numericScore >= 90) {
            return 'bg-green-100 text-green-800';
        }
        if (numericScore >= 50) {
            return 'bg-yellow-100 text-yellow-800';
        }
        return 'bg-red-100 text-red-800';
    }

    function renderCategoryCards(categoryScores) {
        categoryCardsEl.innerHTML = '';

        Object.keys(categoryScores).forEach(function(key) {
            var score = categoryScores[key];
            var card = document.createElement('div');
            card.className = 'bg-white border border-blue-100 rounded-xl p-4 shadow-sm';
            card.innerHTML = [
                '<p class="text-sm text-slate-600">' + formatCategoryLabel(key) + '</p>',
                '<div class="mt-2 inline-flex px-3 py-1 rounded-full text-sm font-semibold ' + scorePill(score) + '">' + score + '/100</div>'
            ].join('');
            categoryCardsEl.appendChild(card);
        });
    }

    function renderCoreWebVitals(cwvData) {
        cwvEl.innerHTML = '';

        var vitals = [
            { key: 'lcp', label: 'LCP' },
            { key: 'cls', label: 'CLS' },
            { key: 'inp', label: 'INP' }
        ];

        vitals.forEach(function(vital) {
            var metricData = cwvData ? cwvData[vital.key] : null;
            var row = document.createElement('div');
            row.className = 'flex justify-between items-center';
            row.innerHTML = [
                '<span class="text-slate-700">' + vital.label + '</span>',
                '<span class="font-bold text-anchor-navy">' + formatMetricValue(vital.key, metricData) + '</span>'
            ].join('');
            cwvEl.appendChild(row);
        });

        if (cwvData && cwvData.source) {
            var sourceEl = document.createElement('p');
            sourceEl.className = 'text-xs text-slate-500 pt-2';
            sourceEl.textContent = 'Field data source: ' + cwvData.source;
            cwvEl.appendChild(sourceEl);
        }
    }

    function renderTopFixes(fixes) {
        topFixesEl.innerHTML = '';

        if (!Array.isArray(fixes) || fixes.length === 0) {
            var emptyFix = document.createElement('li');
            emptyFix.textContent = 'No major Lighthouse opportunities were flagged for this URL.';
            topFixesEl.appendChild(emptyFix);
            return;
        }

        fixes.slice(0, 5).forEach(function(fix) {
            var item = document.createElement('li');
            item.textContent = fix;
            topFixesEl.appendChild(item);
        });
    }

    function renderExtraChecks(checks) {
        extraChecksEl.innerHTML = '';

        if (!Array.isArray(checks) || checks.length === 0) {
            var emptyState = document.createElement('p');
            emptyState.className = 'text-slate-600';
            emptyState.textContent = 'No extra checks were returned for this run.';
            extraChecksEl.appendChild(emptyState);
            return;
        }

        checks.forEach(function(check) {
            var wrap = document.createElement('div');
            wrap.className = 'rounded-lg border px-4 py-3 ' + (check.passed ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50');

            var status = check.passed ? 'Pass' : 'Needs work';
            var recommendation = check.recommendation || '';

            wrap.innerHTML = [
                '<p class="font-semibold text-anchor-navy">' + check.label + ' <span class="text-sm text-slate-600">(' + status + ')</span></p>',
                '<p class="text-sm text-slate-700 mt-1">' + recommendation + '</p>'
            ].join('');

            extraChecksEl.appendChild(wrap);
        });
    }

    function renderResults(report) {
        var overall = Number(report.overall_score || 0);
        overallScoreEl.textContent = String(overall);

        reportSummaryEl.textContent = report.email_sent
            ? 'Complete. Your report is on screen and has also been emailed.'
            : 'Complete. Your report is ready.';

        renderCategoryCards(report.category_scores || {});
        mobileScoreEl.textContent = String(report.mobile_score != null ? report.mobile_score + '/100' : '-');
        desktopScoreEl.textContent = String(report.desktop_score != null ? report.desktop_score + '/100' : '-');
        renderCoreWebVitals(report.core_web_vitals || null);
        renderTopFixes(report.top_fixes || []);
        renderExtraChecks(report.extra_checks || []);

        resultsEl.classList.remove('hidden');
        resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    async function fetchWithTimeout(url, options, timeoutMs) {
        var controller = new AbortController();
        var timeout = setTimeout(function() {
            controller.abort();
        }, timeoutMs);

        try {
            return await fetch(url, {
                method: options.method || 'GET',
                headers: options.headers || {},
                body: options.body,
                signal: controller.signal
            });
        } finally {
            clearTimeout(timeout);
        }
    }

    emailInput.addEventListener('input', updateConsentVisibility);
    updateConsentVisibility();

    form.addEventListener('submit', async function(event) {
        event.preventDefault();

        clearError();

        var normalizedUrl;
        var email = emailInput.value.trim();

        try {
            normalizedUrl = normalizeUrl(urlInput.value);
        } catch (err) {
            showError(err.message);
            return;
        }

        if (email && !isValidEmail(email)) {
            showError('Please enter a valid email address.');
            return;
        }

        if (email && !consentCheckbox.checked) {
            showError('Please tick "Email me the report" to receive your report by email.');
            return;
        }

        startLoadingState();

        try {
            var response = await fetchWithTimeout(resolveApiUrl(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    website_url: normalizedUrl,
                    email: email || null,
                    email_consent: Boolean(email && consentCheckbox.checked)
                })
            }, 45000);

            var payload;
            var rawResponse = await response.text();
            try {
                payload = rawResponse ? JSON.parse(rawResponse) : null;
            } catch (err) {
                payload = null;
            }

            if (!response.ok) {
                if (response.status === 403 && /not configured to allow the HTTP request method/i.test(rawResponse || '')) {
                    throw new Error('Your CloudFront distribution is blocking POST requests to /api/health-check. Add a /api/* behavior that allows POST and routes to API Gateway.');
                }
                var message = payload && payload.error ? payload.error : 'Health check failed. Please try again.';
                throw new Error(message);
            }

            renderResults(payload);
            stopLoadingState('Report complete.');
        } catch (err) {
            if (err.name === 'AbortError') {
                showError('The health check timed out. Please retry in a moment.');
            } else {
                showError(err.message || 'Health check failed. Please try again.');
            }
            stopLoadingState('');
        }
    });
})();
