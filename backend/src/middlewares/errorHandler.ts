import type { ErrorRequestHandler } from 'express';
import { env } from '../config/env.js';

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  console.error('Error no controlado:', error);
  const status =
    error instanceof SyntaxError && 'status' in error && error.status === 400 ? 400 : 500;
  res.status(status).json({
    status: 'error',
    message: status === 400 ? 'JSON inválido.' : 'Error interno del servidor.',
    ...(env.nodeEnv !== 'production' && error instanceof Error ? { stack: error.stack } : {}),
  });
};
