import dotenv from 'dotenv';
import { randomBytes } from 'node:crypto';
import { Pool } from 'pg';
import { fixedAccounts } from './accounts.js';

dotenv.config({ path: '.env.local', quiet: true });
const base = `http://127.0.0.1:${process.env.PORT || 3000}`;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prizeId = `smoke-${randomBytes(8).toString('hex')}`;
let winId = '';

async function request(route: string, method = 'GET', body?: unknown, cookie = '', expected = 200) {
  const response = await fetch(`${base}/api${route}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  if (response.status !== expected) throw new Error(`${method} ${route}: expected ${expected}, got ${response.status}: ${JSON.stringify(data)}`);
  return { data, cookie: response.headers.get('set-cookie')?.split(';')[0] || '' };
}

try {
  await request('/auth/register', 'POST', { email: 'someone@example.test', password: 'irrelevant' }, '', 404);
  const admin = await request('/auth/login', 'POST', { email: fixedAccounts[0].email, password: fixedAccounts[0].password });
  const secondAdmin = await request('/auth/login', 'POST', { email: fixedAccounts[1].email, password: fixedAccounts[1].password });
  const member = await request('/auth/login', 'POST', { email: fixedAccounts[2].email, password: fixedAccounts[2].password });
  if (admin.data.user.role !== 'admin' || secondAdmin.data.user.role !== 'admin' || member.data.user.role !== 'user') throw new Error('Fixed account roles are incorrect');
  await request('/prizes', 'POST', { id: prizeId, label: 'Smoke prize', probability: 1, color: '#ffffff', textColor: '#000000', status: 'نشط', cost: 1 }, member.cookie, 403);
  await request('/prizes', 'POST', { id: prizeId, label: 'Smoke prize', probability: 1, color: '#ffffff', textColor: '#000000', status: 'نشط', cost: 1 }, admin.cookie, 201);
  await request('/wins', 'POST', { prizeId, valueAssumed: 1, customerName: 'Smoke Test', customerPhone: '123456789' }, member.cookie, 404);
  const win = await request('/spin', 'POST', { valueAssumed: 1, customerName: 'Smoke Test', customerPhone: '123456789' }, member.cookie, 201);
  if (!win.data.prizeId) throw new Error('Spin did not select a prize');
  winId = win.data.win.id;
  const state = await request('/state', 'GET', undefined, admin.cookie);
  if (!state.data.wins.some((item: { id: string }) => item.id === winId)) throw new Error('Win was not persisted');
  await request('/auth/logout', 'POST', undefined, member.cookie);
  await request('/state', 'GET', undefined, member.cookie, 401);
  await request('/auth/logout', 'POST', undefined, admin.cookie);
  await request('/auth/logout', 'POST', undefined, secondAdmin.cookie);
  console.log('Smoke test passed: fixed roles, disabled registration, permissions, prize, win, logout.');
} finally {
  await pool.query('DELETE FROM gs_wins WHERE id=$1', [winId]);
  await pool.query('DELETE FROM gs_prizes WHERE id=$1', [prizeId]);
  await pool.end();
}
