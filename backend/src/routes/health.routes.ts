import { Router } from 'express';
import { pool } from '../db/pool.js';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'helpdesk-api', time: new Date().toISOString() });
});

healthRouter.get('/db', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', service: 'helpdesk-db', time: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', message: 'Base de datos no disponible.' });
  }
});
