import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Metrics
const errorRate = new Rate('errors');
const redirectDuration = new Trend('redirect_duration');

const URL_SERVICE = __ENV.URL_SERVICE || 'http://s.example.local';

// Stress test - push until breaking point
export const options = {
    stages: [
        { duration: '1m', target: 100 },   // Ramp to 100 users
        { duration: '2m', target: 200 },   // Increase to 200
        { duration: '2m', target: 500 },   // Push to 500
        { duration: '2m', target: 1000 },  // Stress test - 1000 users
        { duration: '1m', target: 0 },     // Ramp down
    ],
    thresholds: {
        'redirect_duration': ['p(95)<500'],
        'errors': ['rate<0.5'],
    },
    summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

// First, create a short URL to test
export function setup() {
    const payload = JSON.stringify({
        url: 'https://github.com/golang/go',
    });

    const res = http.post(`${URL_SERVICE}/shorten`, payload, {
        headers: { 'Content-Type': 'application/json' },
    });

    if (res.status === 201) {
        const body = JSON.parse(res.body);
        console.log(`Created test URL: ${body.short_code}`);
        return { shortCode: body.short_code };
    }

    console.log('Failed to create test URL, using placeholder');
    return { shortCode: 'test01' };
}

export default function (data) {
    const startTime = Date.now();
    const res = http.get(`${URL_SERVICE}/${data.shortCode}`, {
        redirects: 0,
    });
    const duration = Date.now() - startTime;

    redirectDuration.add(duration);

    const success = check(res, {
        'status is 302': (r) => r.status === 302,
    });

    errorRate.add(!success);

    sleep(Math.random() * 0.1); // Minimal think time for stress test
}

export function handleSummary(data) {
    const p50 = data.metrics.redirect_duration?.values?.med || 0;
    const p95 = data.metrics.redirect_duration?.values['p(95)'] || 0;
    const p99 = data.metrics.redirect_duration?.values['p(99)'] || 0;
    const errors = data.metrics.errors?.values?.rate || 0;

    console.log('\n========================================');
    console.log('     URL SERVICE STRESS TEST RESULTS');
    console.log('========================================\n');
    console.log(`Requests: ${data.metrics.http_reqs?.values?.count || 0}`);
    console.log(`Duration p50: ${p50.toFixed(2)}ms`);
    console.log(`Duration p95: ${p95.toFixed(2)}ms`);
    console.log(`Duration p99: ${p99.toFixed(2)}ms`);
    console.log(`Error Rate: ${(errors * 100).toFixed(2)}%`);

    if (p95 > 200 || errors > 0.1) {
        console.log('\n⚠️  URL Service needs scaling!');
    } else {
        console.log('\n✅ URL Service handling load well');
    }

    return {};
}
