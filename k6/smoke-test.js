import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const createDuration = new Trend('create_duration');
const redirectDuration = new Trend('redirect_duration');
const analyticsDuration = new Trend('analytics_duration');

const URL_SERVICE = __ENV.URL_SERVICE || 'http://localhost:8080';
const ANALYTICS_SERVICE = __ENV.ANALYTICS_SERVICE || 'http://localhost:8081';

// Quick smoke test - just verify services work
export const options = {
    vus: 5,
    duration: '30s',
    thresholds: {
        'create_duration': ['p(95)<1000'],
        'redirect_duration': ['p(95)<500'],
        'analytics_duration': ['p(95)<500'],
    },
};

export default function () {
    // Test 1: Create URL
    const payload = JSON.stringify({
        url: `https://example.com/test/${Date.now()}`,
    });

    let start = Date.now();
    let res = http.post(`${URL_SERVICE}/shorten`, payload, {
        headers: { 'Content-Type': 'application/json' },
    });
    createDuration.add(Date.now() - start);

    check(res, { 'URL created': (r) => r.status === 201 });

    let shortCode = 'test';
    try {
        shortCode = JSON.parse(res.body).short_code;
    } catch (e) { }

    sleep(0.5);

    // Test 2: Redirect
    start = Date.now();
    res = http.get(`${URL_SERVICE}/${shortCode}`, { redirects: 0 });
    redirectDuration.add(Date.now() - start);

    check(res, { 'Redirect works': (r) => r.status === 302 });

    sleep(0.5);

    // Test 3: Analytics
    start = Date.now();
    res = http.get(`${ANALYTICS_SERVICE}/stats`);
    analyticsDuration.add(Date.now() - start);

    check(res, { 'Analytics works': (r) => r.status === 200 });

    sleep(1);
}

export function handleSummary(data) {
    console.log('\n========================================');
    console.log('        SMOKE TEST RESULTS');
    console.log('========================================\n');

    const metrics = [
        { name: 'URL Create', key: 'create_duration' },
        { name: 'URL Redirect', key: 'redirect_duration' },
        { name: 'Analytics', key: 'analytics_duration' },
    ];

    for (const m of metrics) {
        const d = data.metrics[m.key]?.values;
        if (d) {
            console.log(`${m.name}:`);
            console.log(`  p50: ${d.med?.toFixed(2)}ms`);
            console.log(`  p95: ${d['p(95)']?.toFixed(2)}ms\n`);
        }
    }

    console.log('✅ Smoke test complete');
    return {};
}
