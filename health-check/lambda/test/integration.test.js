const test = require('node:test');
const assert = require('node:assert/strict');

const healthCheck = require('../index.js');

const TEST_ENV_KEYS = [
    'ALLOWED_ORIGINS',
    'PAGESPEED_API_KEY_PARAM',
    'SES_FROM_EMAIL',
    'LEAD_NOTIFICATION_EMAIL',
    'RUNS_TABLE_NAME',
    'RATE_LIMIT_TABLE_NAME',
    'PAGESPEED_TIMEOUT_MS',
    'RATE_LIMIT_WINDOW_SECONDS',
    'RATE_LIMIT_MAX_REQUESTS'
];

function applyBaseEnv() {
    process.env.ALLOWED_ORIGINS = 'https://www.anchorwebco.com.au';
    process.env.PAGESPEED_API_KEY_PARAM = '/anchor-web-co/health-check/pagespeed-api-key';
    process.env.SES_FROM_EMAIL = 'noreply@anchorwebco.com.au';
    process.env.LEAD_NOTIFICATION_EMAIL = 'info@anchorwebco.com.au';
    process.env.RUNS_TABLE_NAME = 'health_check_runs';
    process.env.RATE_LIMIT_TABLE_NAME = 'health_check_rate_limits';
    process.env.PAGESPEED_TIMEOUT_MS = '5000';
    process.env.RATE_LIMIT_WINDOW_SECONDS = '3600';
    process.env.RATE_LIMIT_MAX_REQUESTS = '10';
}

function clearTestEnv() {
    for (const key of TEST_ENV_KEYS) {
        delete process.env[key];
    }
}

function buildEvent(email) {
    return {
        headers: {
            origin: 'https://www.anchorwebco.com.au'
        },
        requestContext: {
            http: {
                method: 'POST',
                sourceIp: '203.0.113.8'
            }
        },
        body: JSON.stringify({
            website_url: 'https://example.com',
            email,
            email_consent: true
        })
    };
}

function makeJsonResponse(payload, statusCode) {
    return new Response(JSON.stringify(payload), {
        status: statusCode || 200,
        headers: {
            'Content-Type': 'application/json'
        }
    });
}

function buildPageSpeedPayload(strategy) {
    const basePerformance = strategy === 'mobile' ? 0.68 : 0.88;

    return {
        lighthouseResult: {
            categories: {
                performance: { score: basePerformance },
                seo: { score: 0.92 },
                'best-practices': { score: 0.95 },
                accessibility: { score: 0.89 }
            },
            audits: {
                'unused-javascript': {
                    score: 0.25,
                    scoreDisplayMode: 'numeric',
                    numericValue: 1400
                },
                'uses-optimized-images': {
                    score: 0.35,
                    scoreDisplayMode: 'numeric',
                    numericValue: 900
                }
            }
        },
        loadingExperience: {
            metrics: {
                LARGEST_CONTENTFUL_PAINT_MS: {
                    percentile: 2800,
                    category: 'AVERAGE'
                },
                CUMULATIVE_LAYOUT_SHIFT_SCORE: {
                    percentile: 18,
                    category: 'GOOD'
                },
                INTERACTION_TO_NEXT_PAINT: {
                    percentile: 220,
                    category: 'GOOD'
                }
            }
        }
    };
}

function createDefaultFetchMock() {
    return async (url, options = {}) => {
        const requestUrl = new URL(url);
        const path = requestUrl.pathname;
        const method = options.method || 'GET';

        if (requestUrl.hostname === 'www.googleapis.com' && path === '/pagespeedonline/v5/runPagespeed') {
            const strategy = requestUrl.searchParams.get('strategy');
            return makeJsonResponse(buildPageSpeedPayload(strategy));
        }

        if (requestUrl.protocol === 'http:' && requestUrl.hostname === 'example.com') {
            return new Response('', {
                status: 301,
                headers: {
                    location: 'https://example.com/'
                }
            });
        }

        if (requestUrl.protocol === 'https:' && requestUrl.hostname === 'example.com' && path === '/') {
            return new Response('<html><head><title>Example</title><meta name="description" content="Example description"></head><body>ok</body></html>', {
                status: 200,
                headers: {
                    'content-type': 'text/html'
                }
            });
        }

        if (requestUrl.protocol === 'https:' && requestUrl.hostname === 'example.com' && (path === '/sitemap.xml' || path === '/robots.txt')) {
            if (method === 'HEAD') {
                return new Response('', { status: 200 });
            }
            return new Response('ok', { status: 200 });
        }

        return new Response('', { status: 404 });
    };
}

function createMockDeps(options = {}) {
    const calls = {
        ses: [],
        dynamo: [],
        fetch: 0
    };

    const fetchFn = async (...args) => {
        calls.fetch += 1;
        return (options.fetchFn || createDefaultFetchMock())(...args);
    };

    const ssmClient = {
        send: async (command) => {
            if (command.constructor.name !== 'GetParameterCommand') {
                throw new Error(`Unexpected SSM command: ${command.constructor.name}`);
            }
            return {
                Parameter: {
                    Value: 'test-pagespeed-key'
                }
            };
        }
    };

    const sesClient = {
        send: async (command) => {
            calls.ses.push(command.constructor.name);

            if (command.constructor.name === 'GetAccountCommand') {
                return options.sesAccount || { ProductionAccessEnabled: true };
            }

            if (command.constructor.name === 'GetEmailIdentityCommand') {
                if (typeof options.getEmailIdentity === 'function') {
                    return options.getEmailIdentity(command.input.EmailIdentity);
                }
                const notFound = new Error('Identity not found');
                notFound.name = 'NotFoundException';
                throw notFound;
            }

            if (command.constructor.name === 'SendEmailCommand') {
                if (typeof options.sendEmail === 'function') {
                    return options.sendEmail(command.input);
                }
                return { MessageId: 'mock-message-id' };
            }

            throw new Error(`Unexpected SES command: ${command.constructor.name}`);
        }
    };

    const dynamoClient = {
        send: async (command) => {
            calls.dynamo.push(command.constructor.name);
            return {};
        }
    };

    return {
        deps: {
            randomUUIDFn: () => 'run-test-uuid',
            ssmClient,
            sesClient,
            dynamoClient,
            fetchFn
        },
        calls
    };
}

function parsePayload(response) {
    return JSON.parse(response.body);
}

test('returns 200 and sends both emails for a valid request', { concurrency: false }, async () => {
    applyBaseEnv();
    healthCheck.__testing.resetRuntimeDependenciesForTests();

    const { deps, calls } = createMockDeps({
        sesAccount: {
            ProductionAccessEnabled: true
        }
    });
    healthCheck.__testing.setRuntimeDependenciesForTests(deps);

    const response = await healthCheck.handler(buildEvent('prospect@example.com'));
    const payload = parsePayload(response);

    assert.equal(response.statusCode, 200);
    assert.equal(payload.email_sent, true);
    assert.equal(payload.lead_notification_sent, true);
    assert.equal(payload.saved, true);
    assert.equal(calls.ses.filter((name) => name === 'SendEmailCommand').length, 2);
    assert.ok(Array.isArray(payload.top_fixes));
    assert.ok(payload.top_fixes.length > 0);

    healthCheck.__testing.resetRuntimeDependenciesForTests();
    clearTestEnv();
});

test('fails fast for unverified recipients when SES is in sandbox', { concurrency: false }, async () => {
    applyBaseEnv();
    healthCheck.__testing.resetRuntimeDependenciesForTests();

    const { deps, calls } = createMockDeps({
        sesAccount: {
            ProductionAccessEnabled: false
        },
        fetchFn: async () => {
            throw new Error('PageSpeed fetch should not be called for sandbox-unverified recipients');
        }
    });
    healthCheck.__testing.setRuntimeDependenciesForTests(deps);

    const response = await healthCheck.handler(buildEvent('outside-recipient@example.net'));
    const payload = parsePayload(response);

    assert.equal(response.statusCode, 400);
    assert.match(payload.error, /verified email addresses/i);
    assert.equal(calls.fetch, 0);
    assert.equal(calls.ses.filter((name) => name === 'SendEmailCommand').length, 0);

    healthCheck.__testing.resetRuntimeDependenciesForTests();
    clearTestEnv();
});

test('returns 504 when PageSpeed calls abort', { concurrency: false }, async () => {
    applyBaseEnv();
    healthCheck.__testing.resetRuntimeDependenciesForTests();

    const { deps, calls } = createMockDeps({
        sesAccount: {
            ProductionAccessEnabled: true
        },
        fetchFn: async (url) => {
            if (String(url).includes('runPagespeed')) {
                const abortError = new Error('PageSpeed timed out');
                abortError.name = 'AbortError';
                throw abortError;
            }
            return new Response('', { status: 200 });
        }
    });
    healthCheck.__testing.setRuntimeDependenciesForTests(deps);

    const response = await healthCheck.handler(buildEvent('prospect@example.com'));
    const payload = parsePayload(response);

    assert.equal(response.statusCode, 504);
    assert.match(payload.error, /timed out/i);
    assert.equal(calls.ses.filter((name) => name === 'SendEmailCommand').length, 0);

    healthCheck.__testing.resetRuntimeDependenciesForTests();
    clearTestEnv();
});
