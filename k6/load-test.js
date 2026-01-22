import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const urlCreateErrors = new Rate('url_create_errors');
const urlRedirectErrors = new Rate('url_redirect_errors');
const analyticsErrors = new Rate('analytics_errors');

const urlCreateDuration = new Trend('url_create_duration');
const urlRedirectDuration = new Trend('url_redirect_duration');
const analyticsGetDuration = new Trend('analytics_get_duration');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost';
const URL_SERVICE = __ENV.URL_SERVICE || `${BASE_URL}:8080`;
const ANALYTICS_SERVICE = __ENV.ANALYTICS_SERVICE || `${BASE_URL}:8081`;

// Test scenarios simulating real-world traffic
export const options = {
    scenarios: {
        // Scenario 1: URL Creation (low traffic - users creating short URLs)
        url_creation: {
            executor: 'ramping-vus',
            exec: 'createUrls',
            startVUs: 1,
            stages: [
                { duration: '30s', target: 10 },   // Ramp up
                { duration: '1m', target: 10 },    // Stay at 10 VUs
                { duration: '30s', target: 20 },   // Increase
                { duration: '1m', target: 20 },    // Stay at 20 VUs
                { duration: '30s', target: 0 },    // Ramp down
            ],
            gracefulRampDown: '10s',
        },

        // Scenario 2: URL Redirects (HIGH traffic - users clicking short URLs)
        url_redirects: {
            executor: 'ramping-vus',
            exec: 'redirectUrls',
            startVUs: 5,
            stages: [
                { duration: '30s', target: 50 },   // Ramp up fast
                { duration: '1m', target: 100 },   // Push to 100 VUs
                { duration: '1m', target: 200 },   // Stress test
                { duration: '1m', target: 200 },   // Sustain
                { duration: '30s', target: 0 },    // Ramp down
            ],
            gracefulRampDown: '10s',
        },

        // Scenario 3: Analytics API (moderate traffic - dashboard users)
        analytics_reads: {
            executor: 'ramping-vus',
            exec: 'getAnalytics',
            startVUs: 1,
            stages: [
                { duration: '30s', target: 5 },
                { duration: '2m', target: 10 },
                { duration: '30s', target: 0 },
            ],
            gracefulRampDown: '10s',
        },
    },
    thresholds: {
        // URL Service thresholds
        'url_create_duration': ['p(95)<500', 'p(99)<1000'],
        'url_redirect_duration': ['p(95)<100', 'p(99)<200'],
        'url_create_errors': ['rate<0.1'],
        'url_redirect_errors': ['rate<0.05'],

        // Analytics Service thresholds
        'analytics_get_duration': ['p(95)<300', 'p(99)<500'],
        'analytics_errors': ['rate<0.1'],
    },
};

// Shared state for short codes
const createdShortCodes = [];

// Helper to generate random URL
function randomUrl() {
    const domains = ['github.com', 'google.com', 'example.com', 'test.org'];
    const paths = ['page1', 'page2', 'article', 'post', 'view'];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    const path = paths[Math.floor(Math.random() * paths.length)];
    return `https://${domain}/${path}/${Math.random().toString(36).substring(7)}`;
}

// Scenario 1: Create short URLs
export function createUrls() {
    group('URL Creation', () => {
        const payload = JSON.stringify({
            url: randomUrl(),
        });

        const params = {
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const startTime = Date.now();
        const res = http.post(`${URL_SERVICE}/shorten`, payload, params);
        const duration = Date.now() - startTime;

        urlCreateDuration.add(duration);

        const success = check(res, {
            'URL created successfully': (r) => r.status === 201,
            'Response has short_code': (r) => {
                try {
                    const body = JSON.parse(r.body);
                    if (body.short_code) {
                        createdShortCodes.push(body.short_code);
                        return true;
                    }
                } catch (e) { }
                return false;
            },
        });

        urlCreateErrors.add(!success);

        sleep(Math.random() * 2 + 1); // 1-3 second think time
    });
}

// Scenario 2: Redirect URLs (simulates clicking short links)
export function redirectUrls() {
    group('URL Redirects', () => {
        // Use either a created short code or generate a test one
        let shortCode;
        if (createdShortCodes.length > 0) {
            shortCode = createdShortCodes[Math.floor(Math.random() * createdShortCodes.length)];
        } else {
            // Use a placeholder - will get 404 but still tests the service
            shortCode = 'test01';
        }

        const startTime = Date.now();
        const res = http.get(`${URL_SERVICE}/${shortCode}`, {
            redirects: 0, // Don't follow redirects, just measure response time
        });
        const duration = Date.now() - startTime;

        urlRedirectDuration.add(duration);

        const success = check(res, {
            'Redirect status (302 or 404)': (r) => r.status === 302 || r.status === 404,
        });

        urlRedirectErrors.add(!success && res.status !== 404);

        sleep(Math.random() * 0.5); // Very short think time - simulates rapid clicks
    });
}

// Scenario 3: Get Analytics
export function getAnalytics() {
    group('Analytics API', () => {
        const startTime = Date.now();
        const res = http.get(`${ANALYTICS_SERVICE}/stats`);
        const duration = Date.now() - startTime;

        analyticsGetDuration.add(duration);

        const success = check(res, {
            'Analytics retrieved': (r) => r.status === 200,
            'Response is array': (r) => {
                try {
                    const body = JSON.parse(r.body);
                    return Array.isArray(body);
                } catch (e) { }
                return false;
            },
        });

        analyticsErrors.add(!success);

        sleep(Math.random() * 3 + 2); // 2-5 second think time (dashboard refresh)
    });
}

// Summary handler
export function handleSummary(data) {
    console.log('\n========================================');
    console.log('        LOAD TEST SUMMARY');
    console.log('========================================\n');

    console.log('📊 Service Performance Analysis:\n');

    // URL Create stats
    if (data.metrics.url_create_duration) {
        const create = data.metrics.url_create_duration.values;
        console.log('🔗 URL Service - Create Endpoint:');
        console.log(`   p50: ${create.med?.toFixed(2) || 'N/A'}ms`);
        console.log(`   p95: ${create['p(95)']?.toFixed(2) || 'N/A'}ms`);
        console.log(`   p99: ${create['p(99)']?.toFixed(2) || 'N/A'}ms`);
    }

    // URL Redirect stats
    if (data.metrics.url_redirect_duration) {
        const redirect = data.metrics.url_redirect_duration.values;
        console.log('\n🚀 URL Service - Redirect Endpoint:');
        console.log(`   p50: ${redirect.med?.toFixed(2) || 'N/A'}ms`);
        console.log(`   p95: ${redirect['p(95)']?.toFixed(2) || 'N/A'}ms`);
        console.log(`   p99: ${redirect['p(99)']?.toFixed(2) || 'N/A'}ms`);
    }

    // Analytics stats
    if (data.metrics.analytics_get_duration) {
        const analytics = data.metrics.analytics_get_duration.values;
        console.log('\n📈 Analytics Service:');
        console.log(`   p50: ${analytics.med?.toFixed(2) || 'N/A'}ms`);
        console.log(`   p95: ${analytics['p(95)']?.toFixed(2) || 'N/A'}ms`);
        console.log(`   p99: ${analytics['p(99)']?.toFixed(2) || 'N/A'}ms`);
    }

    console.log('\n========================================');
    console.log('        SCALING RECOMMENDATIONS');
    console.log('========================================\n');

    // Analysis
    const redirectP95 = data.metrics.url_redirect_duration?.values['p(95)'] || 0;
    const createP95 = data.metrics.url_create_duration?.values['p(95)'] || 0;
    const analyticsP95 = data.metrics.analytics_get_duration?.values['p(95)'] || 0;

    if (redirectP95 > 100) {
        console.log('⚠️  URL Service (Redirects) is slow!');
        console.log('    → Scale URL Service first');
        console.log('    → Consider Redis read replicas\n');
    }

    if (createP95 > 500) {
        console.log('⚠️  URL Service (Create) is slow!');
        console.log('    → Scale URL Service');
        console.log('    → Check Redis write performance\n');
    }

    if (analyticsP95 > 300) {
        console.log('⚠️  Analytics Service is slow!');
        console.log('    → Scale Analytics Service');
        console.log('    → Consider async processing\n');
    }

    if (redirectP95 <= 100 && createP95 <= 500 && analyticsP95 <= 300) {
        console.log('✅ All services performing well!');
        console.log('   No immediate scaling needed.\n');
    }

    return {
        'stdout': JSON.stringify(data, null, 2),
    };
}
