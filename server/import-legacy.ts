import dotenv from 'dotenv';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { Pool } from 'pg';

dotenv.config({ path: '.env.local', quiet: true });
const source = process.argv[2];
if (!source || !process.env.DATABASE_URL) throw new Error('Usage: npm run import:legacy -- path/to/export.json (DATABASE_URL required)');

const exportData = JSON.parse(await readFile(source, 'utf8'));
const list = (key: string) => Array.isArray(exportData[key]) ? exportData[key] as Record<string, any>[] : [];
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
const counts = { prizes: 0, accessRequests: 0, wins: 0 };
try {
  await client.query('BEGIN');
  for (const raw of list('prizes')) {
    if (!raw.id || !raw.label) continue;
    const id = String(raw.id);
    const prize = { id, label: String(raw.label), probability: Number(raw.probability) || 0, color: raw.color || '#F4EBD0', textColor: raw.textColor || '#775a19', status: raw.status === 'غير نشط' ? 'غير نشط' : 'نشط', cost: Number(raw.cost) || 0, isGoldGradient: !!raw.isGoldGradient };
    const result = await client.query(`INSERT INTO gs_prizes (id,data) VALUES ($1,$2)
      ON CONFLICT (id) DO UPDATE SET data=EXCLUDED.data WHERE gs_prizes.data->>'label'='item' RETURNING id`, [id, prize]);
    counts.prizes += result.rowCount || 0;
  }
  for (const raw of list('accessRequests')) {
    const email = String(raw.email || '').trim().toLowerCase();
    if (!email.includes('@')) continue;
    // Historical requests do not control the fixed login accounts.
    const request = { id: String(raw.id || `legacy_${randomBytes(6).toString('hex')}`), firstName: String(raw.firstName || 'عضو'), lastName: String(raw.lastName || ''), email, purpose: String(raw.purpose || 'طلب قديم'), status: raw.status || 'قيد الانتظار', requestDate: String(raw.requestDate || ''), position: String(raw.position || '') };
    const result = await client.query('INSERT INTO gs_access_requests (email,data) VALUES ($1,$2) ON CONFLICT (email) DO NOTHING RETURNING email', [email, request]);
    counts.accessRequests += result.rowCount || 0;
  }
  for (const raw of list('wins')) {
    const id = String(raw.id || `legacy_${randomBytes(8).toString('hex')}`);
    const email = String(raw.email || '').trim().toLowerCase();
    const win = { ...raw, id, email, valueAssumed: Number(raw.valueAssumed) || 0, legacy: true };
    const result = await client.query('INSERT INTO gs_wins (id,email,data) VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING RETURNING id', [id, email, win]);
    counts.wins += result.rowCount || 0;
  }
  await client.query('COMMIT');
  console.log('Imported:', counts);
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
  await pool.end();
}
