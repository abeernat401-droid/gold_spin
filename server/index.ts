import express from 'express';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import app, { initializeDatabase } from './app.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function start() {
  await initializeDatabase();
  if (process.argv.includes('--production')) {
    app.use(express.static(path.join(root, 'dist')));
    app.get('*', (_req, res) => res.sendFile(path.join(root, 'dist', 'index.html')));
  } else {
    const vite = await createViteServer({ root, server: { middlewareMode: true, hmr: true }, appType: 'custom' });
    app.use(vite.middlewares);
    app.use('*', async (req, res, next) => {
      try {
        const html = await readFile(path.join(root, 'index.html'), 'utf8');
        res.status(200).type('html').send(await vite.transformIndexHtml(req.originalUrl, html));
      } catch (error) { next(error); }
    });
  }
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '127.0.0.1';
  app.listen(port, host, () => console.log(`Gold Spin running at http://${host}:${port}`));
}

start().catch(error => { console.error('Failed to start Gold Spin:', error); process.exit(1); });
