import http from 'k6/http';
import {check} from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://host.docker.internal:8080';
const TEST_EMAIL = __ENV.EMAIL_TEST || 'admin@studyxp.com';
const TEST_PASSWORD = __ENV.PASSWORD_TEST || 'Admin123!';

export const options = {
  vus: 10,
  duration: '30s',
};

export default function () {
    const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
    }), {
        headers: { 'Content-Type': 'application/json' },
    });

    const loginCheck = check(loginRes, {
        'login status is 200': (r) => r.status === 200,
    });

    if (loginCheck && loginRes.body) {
        const body = JSON.parse(loginRes.body);
        const token = body.token;

        const res = http.get(`${BASE_URL}/api/users/me`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });

        check(res, {
            'me status is 200': (r) => r.status === 200,
        });
    }
}