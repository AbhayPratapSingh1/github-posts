import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiDuration = new Trend('api_duration', true);

// Get base URL from environment or default to hosted domain
const BASE_URL = __ENV.BASE_URL || 'https://post-panel-api.onrender.com';

// Test configuration
export const options = {
  stages: [
    { duration: '10s', target: 5 },   // Ramp up
    { duration: '20s', target: 10 },  // Stay at 10 users
    { duration: '10s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 95% of requests under 2s
    errors: ['rate<0.1'],               // Error rate under 10%
  },
};

// API endpoints to test
const endpoints = [
  { name: 'GET /api/posts', method: 'GET', url: '/api/posts?offset=0&limit=12' },
  { name: 'GET /api/posts?page2', method: 'GET', url: '/api/posts?offset=12&limit=12' },
  { name: 'GET /api/posts/:id', method: 'GET', url: '/api/posts/test-post' },
  { name: 'GET /api/posts/search', method: 'GET', url: '/api/posts/search?query=test&offset=0&limit=12' },
  { name: 'GET /api/auth/me', method: 'GET', url: '/api/auth/me' },
  { name: 'GET /', method: 'GET', url: '/' },
  { name: 'GET /docs', method: 'GET', url: '/docs' },
];

export default function () {
  // Round-robin through endpoints
  const endpoint = endpoints[__VU % endpoints.length];
  
  const url = `${BASE_URL}${endpoint.url}`;
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { name: endpoint.name },
  };

  let res;
  
  switch (endpoint.method) {
    case 'GET':
      res = http.get(url, params);
      break;
    case 'POST':
      res = http.post(url, null, params);
      break;
    default:
      res = http.get(url, params);
  }

  // Check response
  const success = check(res, {
    'status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'response time < 2s': (r) => r.timings.duration < 2000,
  });

  // Track metrics
  errorRate.add(!success);
  apiDuration.add(res.timings.duration);

  // Log slow requests
  if (res.timings.duration > 1000) {
    console.log(`SLOW: ${endpoint.name} took ${res.timings.duration.toFixed(0)}ms`);
  }

  sleep(0.5);
}

export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    total_requests: data.metrics.http_reqs?.values?.count || 0,
    failed_requests: data.metrics.http_req_failed?.values?.passes || 0,
    avg_duration: data.metrics.http_req_duration?.values?.avg || 0,
    min_duration: data.metrics.http_req_duration?.values?.min || 0,
    max_duration: data.metrics.http_req_duration?.values?.max || 0,
    p95_duration: data.metrics.http_req_duration?.values?.['p(95)'] || 0,
    p99_duration: data.metrics.http_req_duration?.values?.['p(99)'] || 0,
    rps: data.metrics.http_reqs?.values?.rate || 0,
    error_rate: data.metrics.errors?.values?.rate || 0,
    endpoints: {},
  };

  // Extract per-endpoint metrics from tags
  if (data.root_group && data.root_group.checks) {
    const checks = data.root_group.checks;
    // Group by endpoint name
    for (const check of checks) {
      const name = check.name || 'unknown';
      if (!summary.endpoints[name]) {
        summary.endpoints[name] = {
          name,
          requests: 0,
          avg_duration: 0,
          p95_duration: 0,
        };
      }
    }
  }

  return {
    'loadtests/results/summary.json': JSON.stringify(summary, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, opts) {
  // Simple text summary
  const lines = [];
  lines.push('');
  lines.push('========================================');
  lines.push('         API Performance Summary         ');
  lines.push('========================================');
  lines.push('');
  lines.push(`Total Requests:    ${data.metrics.http_reqs?.values?.count || 0}`);
  lines.push(`Failed Requests:   ${data.metrics.http_req_failed?.values?.passes || 0}`);
  lines.push(`Avg Duration:      ${(data.metrics.http_req_duration?.values?.avg || 0).toFixed(2)}ms`);
  lines.push(`Min Duration:      ${(data.metrics.http_req_duration?.values?.min || 0).toFixed(2)}ms`);
  lines.push(`Max Duration:      ${(data.metrics.http_req_duration?.values?.max || 0).toFixed(2)}ms`);
  lines.push(`P95 Duration:      ${(data.metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(2)}ms`);
  lines.push(`P99 Duration:      ${(data.metrics.http_req_duration?.values?.['p(99)'] || 0).toFixed(2)}ms`);
  lines.push(`Requests/sec:      ${(data.metrics.http_reqs?.values?.rate || 0).toFixed(2)}`);
  lines.push(`Error Rate:        ${((data.metrics.errors?.values?.rate || 0) * 100).toFixed(2)}%`);
  lines.push('');
  lines.push('========================================');
  lines.push('');
  return lines.join('\n');
}
