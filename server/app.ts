import dotenv from 'dotenv';
import express, { type Request, type Response, type NextFunction } from 'express';
import { randomBytes, randomInt, createHash, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { Pool } from 'pg';
import { fixedAccounts } from './accounts.js';

dotenv.config({ path: '.env.local', quiet: true });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required in .env.local');
const pool = new Pool({ connectionString: databaseUrl, max: 5 });
const fixedEmails = new Set<string>(fixedAccounts.map(account => account.email));
if (fixedEmails.size !== fixedAccounts.length) throw new Error('Fixed account emails must be unique');
const scrypt = promisify(scryptCallback);
const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));
app.use('/api', (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
app.use('/api', (req, _res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.headers.origin;
  const expected = `${req.protocol}://${req.get('host')}`;
  if (origin && origin !== expected) return next(apiError(403, 'مصدر الطلب غير مسموح.'));
  next();
});

type Account = { email: string; display_name: string; role: 'admin' | 'user' };
type AuthedRequest = Request & { account?: Account };
const sessionDays = 30;

function apiError(status: number, message: string): Error & { status: number } {
  return Object.assign(new Error(message), { status });
}
function wrap(fn: (req: AuthedRequest, res: Response) => Promise<unknown>) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => { Promise.resolve(fn(req, res)).catch(next); };
}
function emailOf(value: unknown) { return typeof value === 'string' ? value.trim().toLowerCase() : ''; }
function textOf(value: unknown, max = 200) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function isAdmin(account: Account) { return account.role === 'admin'; }
function tokenHash(token: string) { return createHash('sha256').update(token).digest('hex'); }
async function passwordHash(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64) as Buffer;
  return `${salt}:${key.toString('hex')}`;
}
async function verifyPassword(password: string, stored: string) {
  const [salt, expected] = stored.split(':');
  if (!salt || !expected || expected.length !== 128) return false;
  const actual = await scrypt(password, salt, 64) as Buffer;
  return timingSafeEqual(actual, Buffer.from(expected, 'hex'));
}
function cookieToken(req: Request) {
  return req.headers.cookie?.split(';').map(part => part.trim()).find(part => part.startsWith('gs_session='))?.slice('gs_session='.length) || '';
}
async function sessionAccount(req: Request): Promise<Account | null> {
  const token = cookieToken(req);
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const result = await pool.query<Account>(`
    SELECT u.email, u.display_name, u.role
    FROM gs_sessions s JOIN gs_users u ON u.email = s.email
    WHERE s.token_hash = $1 AND s.expires_at > now()`, [tokenHash(token)]);
  return result.rows[0] && fixedEmails.has(result.rows[0].email) ? result.rows[0] : null;
}
async function createSession(res: Response, email: string) {
  const token = randomBytes(32).toString('hex');
  await pool.query(`INSERT INTO gs_sessions (token_hash, email, expires_at)
    VALUES ($1, $2, now() + interval '30 days')`, [tokenHash(token), email]);
  res.cookie('gs_session', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: sessionDays * 86400000, path: '/' });
}
function accountPayload(account: Account | null) {
  if (!account) return null;
  return { email: account.email, displayName: account.display_name, role: account.role };
}
async function requireAccount(req: AuthedRequest, _res: Response, next: NextFunction) {
  try {
    const account = await sessionAccount(req);
    if (!account) throw apiError(401, 'الرجاء تسجيل الدخول.');
    req.account = account;
    next();
  } catch (error) { next(error); }
}
function requireAdmin(req: AuthedRequest, _res: Response, next: NextFunction) {
  if (!req.account || !isAdmin(req.account)) return next(apiError(403, 'غير مصرح لك بهذا الإجراء.'));
  next();
}
function publicPrize(input: any) {
  const label = textOf(input?.label, 100);
  const probability = Number(input?.probability);
  const cost = Number(input?.cost ?? 0);
  if (!label || !Number.isFinite(probability) || probability < 0 || probability > 100 || !Number.isFinite(cost) || cost < 0) throw apiError(400, 'بيانات الجائزة غير صحيحة.');
  const color = textOf(input?.color, 30);
  const textColor = textOf(input?.textColor, 30);
  if (!/^#[0-9a-f]{3,8}$/i.test(color) || !/^#[0-9a-f]{3,8}$/i.test(textColor)) throw apiError(400, 'لون الجائزة غير صحيح.');
  return { label, probability, cost, color, textColor, status: input?.status === 'غير نشط' ? 'غير نشط' : 'نشط', isGoldGradient: !!input?.isGoldGradient };
}

app.get('/api/health', wrap(async (_req, res) => { await pool.query('SELECT 1'); res.json({ ok: true }); }));
app.get('/api/session', wrap(async (req, res) => { res.json({ user: accountPayload(await sessionAccount(req)) }); }));

app.post('/api/auth/login', wrap(async (req, res) => {
  const email = emailOf(req.body.email);
  const password = req.body.password;
  if (!fixedEmails.has(email)) throw apiError(401, 'البريد أو كلمة المرور غير صحيحين.');
  const result = await pool.query<{ password_hash: string }>('SELECT password_hash FROM gs_users WHERE email=$1', [email]);
  if (!result.rows[0] || typeof password !== 'string' || !(await verifyPassword(password, result.rows[0].password_hash))) throw apiError(401, 'البريد أو كلمة المرور غير صحيحين.');
  await createSession(res, email);
  const account = await pool.query<Account>('SELECT email,display_name,role FROM gs_users WHERE email=$1', [email]);
  res.json({ user: accountPayload(account.rows[0]) });
}));
app.post('/api/auth/logout', wrap(async (req, res) => {
  const token = cookieToken(req);
  if (token) await pool.query('DELETE FROM gs_sessions WHERE token_hash=$1', [tokenHash(token)]);
  res.clearCookie('gs_session', { path: '/' });
  res.json({ ok: true });
}));

app.get('/api/state', requireAccount, wrap(async (req, res) => {
  const account = req.account!;
  const [prizes, requests, wins, stats] = await Promise.all([
    pool.query('SELECT data FROM gs_prizes ORDER BY CASE WHEN id ~ $1 THEN id::integer ELSE 999999 END, id', ['^[0-9]+$']),
    isAdmin(account) ? pool.query('SELECT data FROM gs_access_requests ORDER BY created_at DESC') : Promise.resolve({ rows: [] }),
    isAdmin(account) ? pool.query('SELECT data FROM gs_wins ORDER BY created_at DESC') : pool.query(`SELECT data FROM gs_wins WHERE email=$1 AND COALESCE(data->>'legacy','false') <> 'true' ORDER BY created_at DESC`, [account.email]),
    pool.query('SELECT COALESCE(SUM((data->>\'valueAssumed\')::numeric),0) AS total FROM gs_wins'),
  ]);
  res.json({ user: accountPayload(account), prizes: prizes.rows.map(row => row.data), accessRequests: requests.rows.map(row => row.data), wins: wins.rows.map(row => row.data), totalDistributed: Number(stats.rows[0].total) });
}));

app.post('/api/prizes', requireAccount, requireAdmin, wrap(async (req, res) => {
  const id = textOf(req.body?.id, 40) || randomBytes(8).toString('hex');
  const data = { id, ...publicPrize(req.body) };
  await pool.query('INSERT INTO gs_prizes (id,data) VALUES ($1,$2)', [id, data]);
  res.status(201).json({ prize: data });
}));
app.patch('/api/prizes/:id', requireAccount, requireAdmin, wrap(async (req, res) => {
  const old = await pool.query('SELECT data FROM gs_prizes WHERE id=$1', [req.params.id]);
  if (!old.rows[0]) throw apiError(404, 'الجائزة غير موجودة.');
  const data = { ...old.rows[0].data, ...publicPrize({ ...old.rows[0].data, ...req.body }), id: req.params.id };
  if (req.params.id === '1') data.status = 'نشط';
  await pool.query('UPDATE gs_prizes SET data=$2 WHERE id=$1', [req.params.id, data]);
  res.json({ prize: data });
}));
app.delete('/api/prizes/:id', requireAccount, requireAdmin, wrap(async (req, res) => {
  if (req.params.id === '1') throw apiError(400, 'لا يمكن حذف الجائزة الأساسية.');
  await pool.query('DELETE FROM gs_prizes WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
}));
app.post('/api/spin', requireAccount, wrap(async (req, res) => {
  const customerName = textOf(req.body?.customerName, 120);
  const customerPhone = textOf(req.body?.customerPhone, 30);
  const valueAssumed = Number(req.body?.valueAssumed);
  if (!customerName || customerName.length < 3 || !customerPhone || customerPhone.length < 6 || !Number.isFinite(valueAssumed) || valueAssumed < 0 || valueAssumed > 1000000) throw apiError(400, 'بيانات الفوز غير صحيحة.');
  const prizes = await pool.query('SELECT data FROM gs_prizes ORDER BY id');
  const active = prizes.rows.map(row => row.data).filter(prize => prize.status === 'نشط');
  if (!active.length) throw apiError(400, 'لا توجد جوائز نشطة.');
  const weighted = active.filter(prize => Number(prize.probability) > 0);
  const poolOfPrizes = weighted.length ? weighted : active;
  const total = poolOfPrizes.reduce((sum, prize) => sum + (weighted.length ? Number(prize.probability) : 1), 0);
  const draw = randomInt(0, 0x100000000) / 0x100000000 * total;
  let threshold = 0;
  let prize = poolOfPrizes[poolOfPrizes.length - 1];
  for (const candidate of poolOfPrizes) {
    threshold += weighted.length ? Number(candidate.probability) : 1;
    if (draw < threshold) { prize = candidate; break; }
  }
  const account = req.account!;
  const data = { id: `win_${Date.now()}_${randomBytes(4).toString('hex')}`, email: account.email, displayName: account.display_name, prizeLabel: prize.label, valueAssumed, winDate: new Date().toLocaleString('ar-JO'), customerName, customerPhone, customerAddress: textOf(req.body?.customerAddress, 200) };
  await pool.query('INSERT INTO gs_wins (id,email,data) VALUES ($1,$2,$3)', [data.id, account.email, data]);
  res.status(201).json({ prizeId: prize.id, win: data });
}));
app.delete('/api/wins/:id', requireAccount, requireAdmin, wrap(async (req, res) => {
  await pool.query('DELETE FROM gs_wins WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
}));

app.use('/api', (_req, res) => res.status(404).json({ error: 'المسار غير موجود.' }));
app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('API error:', error);
  res.status(error?.status || 500).json({ error: error?.status ? error.message : 'حدث خطأ في الخادم.' });
});

export async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS gs_users (email text PRIMARY KEY, display_name text NOT NULL, password_hash text NOT NULL, role text NOT NULL CHECK (role IN ('admin','user')), created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS gs_access_requests (email text PRIMARY KEY, data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS gs_sessions (token_hash text PRIMARY KEY, email text NOT NULL REFERENCES gs_users(email) ON DELETE CASCADE, expires_at timestamptz NOT NULL);
    CREATE INDEX IF NOT EXISTS gs_sessions_expiry_idx ON gs_sessions(expires_at);
    CREATE TABLE IF NOT EXISTS gs_prizes (id text PRIMARY KEY, data jsonb NOT NULL);
    CREATE TABLE IF NOT EXISTS gs_wins (id text PRIMARY KEY, email text NOT NULL, data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
    CREATE INDEX IF NOT EXISTS gs_wins_email_idx ON gs_wins(email);
    ALTER TABLE gs_access_requests DROP CONSTRAINT IF EXISTS gs_access_requests_email_fkey;
    ALTER TABLE gs_wins DROP CONSTRAINT IF EXISTS gs_wins_email_fkey;
  `);
  await pool.query(`INSERT INTO gs_prizes (id,data) VALUES ('1',$1) ON CONFLICT (id) DO NOTHING`, [{ id: '1', label: 'item', probability: 100, color: '#F4EBD0', textColor: '#775a19', status: 'نشط', cost: 0 }]);
  for (const account of fixedAccounts) {
    await pool.query(`INSERT INTO gs_users (email,display_name,password_hash,role) VALUES ($1,$2,$3,$4)
      ON CONFLICT (email) DO NOTHING`, [account.email, account.name, await passwordHash(account.password), account.role]);
    const existing = await pool.query<{ password_hash: string; role: string }>('SELECT password_hash,role FROM gs_users WHERE email=$1', [account.email]);
    if (!(await verifyPassword(account.password, existing.rows[0].password_hash)) || existing.rows[0].role !== account.role) {
      await pool.query('UPDATE gs_users SET password_hash=$2,role=$3 WHERE email=$1', [account.email, await passwordHash(account.password), account.role]);
      await pool.query('DELETE FROM gs_sessions WHERE email=$1', [account.email]);
    }
  }
  await pool.query('DELETE FROM gs_sessions WHERE expires_at <= now()');
}
export default app;
