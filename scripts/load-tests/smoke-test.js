import http from 'k6/http';
import {check, sleep} from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://host.docker.internal:8080';

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'], // less than 1% of requests should fail  
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/api/health`);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time is less than 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}



