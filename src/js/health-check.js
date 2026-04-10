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
    var successEl = document.getElementById('health-check-success');

    if (!urlInput || !emailInput || !consentWrap || !consentCheckbox || !submitButton) {
        return;
    }
    var isSubmitting = false;
    var lastSubmission = null;
    var duplicateSubmitWindowMs = 60000;

    var progressTimer = null;
    var progressMessages = [
        'Validating your website URL...',
        'Running mobile checks...',
        'Running desktop checks...',
        'Preparing your report email...',
        'Sending report...'
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
        if (!errorEl) {
            return;
        }
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
    }

    function clearError() {
        if (!errorEl) {
            return;
        }
        errorEl.textContent = '';
        errorEl.classList.add('hidden');
    }

    function showSuccess(message) {
        if (!successEl) {
            return;
        }
        successEl.textContent = message;
        successEl.classList.remove('hidden');
    }

    function clearSuccess() {
        if (!successEl) {
            return;
        }
        successEl.textContent = '';
        successEl.classList.add('hidden');
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
        submitButton.textContent = 'Sending...';
        submitButton.disabled = true;

        var index = 0;
        if (progressEl) {
            progressEl.textContent = progressMessages[index];
        }
        progressTimer = setInterval(function() {
            index = (index + 1) % progressMessages.length;
            if (progressEl) {
                progressEl.textContent = progressMessages[index];
            }
        }, 2500);
    }

    function stopLoadingState(message) {
        if (progressTimer) {
            clearInterval(progressTimer);
            progressTimer = null;
        }

        submitButton.textContent = submitButton.getAttribute('data-default-label') || 'Run Health Check';
        submitButton.disabled = false;
        if (progressEl) {
            progressEl.textContent = message || '';
        }
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
        if (isSubmitting) {
            return;
        }

        clearError();
        clearSuccess();

        var normalizedUrl;
        var email = emailInput.value.trim();

        try {
            normalizedUrl = normalizeUrl(urlInput.value);
        } catch (err) {
            showError(err.message);
            return;
        }

        if (!email) {
            showError('Please enter your email so we can send the report.');
            return;
        }

        if (!isValidEmail(email)) {
            showError('Please enter a valid email address.');
            return;
        }

        if (!consentCheckbox.checked) {
            showError('Please tick "Email me the report" to receive your report by email.');
            return;
        }

        var submissionKey = normalizedUrl.toLowerCase() + '|' + email.toLowerCase();
        var now = Date.now();
        if (lastSubmission && lastSubmission.key === submissionKey && (now - lastSubmission.at) < duplicateSubmitWindowMs) {
            showError('This report request was just submitted. Please check your inbox before submitting again.');
            return;
        }

        lastSubmission = {
            key: submissionKey,
            at: now
        };
        isSubmitting = true;
        startLoadingState();

        try {
            var response = await fetchWithTimeout(resolveApiUrl(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    website_url: normalizedUrl,
                    email: email,
                    email_consent: true
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

            if (payload && payload.email_sent === false) {
                throw new Error('Your report ran, but we could not send the email. Please try again in a moment.');
            }

            showSuccess(payload && payload.message
                ? payload.message
                : 'Success. Your report is being emailed now. Please check your inbox in the next minute.');

            if (payload && Array.isArray(payload.warnings) && payload.warnings.length > 0) {
                stopLoadingState(payload.warnings.join(' '));
            } else {
                stopLoadingState('Request complete.');
            }

            form.reset();
            updateConsentVisibility();
        } catch (err) {
            lastSubmission = null;
            if (err.name === 'AbortError') {
                showError('The health check timed out. Please retry in a moment.');
            } else {
                showError(err.message || 'Health check failed. Please try again.');
            }
            stopLoadingState('');
        } finally {
            isSubmitting = false;
        }
    });
})();
