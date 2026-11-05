import dotenv from 'dotenv';
import { createServer } from 'node:http';
import type { Request, Response } from 'express';
import handler from '../api/index';

dotenv.config({ path: '.env.local', quiet: true });

const server = createServer((req, res) => { void handler(req as unknown as Request, res as unknown as Response); });
await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
try {
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No test port');
  const response = await fetch(`http://127.0.0.1:${address.port}/api/index?path=health`);
  const body = await response.json();
  if (response.status !== 200 || !body.ok) throw new Error(`Vercel API handler failed: ${response.status}`);
  console.log('Vercel API handler smoke test passed.');
} finally {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
