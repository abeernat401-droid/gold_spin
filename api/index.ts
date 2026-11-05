import type { Request, Response } from 'express';
import app, { initializeDatabase } from '../server/app.js';

let ready: Promise<void> | undefined;

export default async function handler(req: Request, res: Response) {
  try {
    ready ??= initializeDatabase();
    await ready;
    const queryPath = req.query?.path;
    const route = typeof queryPath === 'string' ? queryPath : new URL(req.url, 'http://localhost').searchParams.get('path') || '';
    req.url = `/api/${route.replace(/^\/+/, '')}`;
    app(req, res);
  } catch (error) {
    ready = undefined;
    console.error('API initialization failed:', error);
    res.status(503).json({ error: 'قاعدة البيانات غير متاحة.' });
  }
}
