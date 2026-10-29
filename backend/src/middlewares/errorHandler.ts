import type { ErrorRequestHandler } from 'express';
import { ApiError } from '../auth/errors.js';

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  let failure: ApiError;
  if (error instanceof ApiError) failure = error;
  else if (error instanceof SyntaxError && 'status' in error && error.status === 400) {
    failure = new ApiError(400, 'INVALID_JSON', 'JSON inválido.');
  } else if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    error.status === 413
  ) {
    failure = new ApiError(
      413,
      'PAYLOAD_TOO_LARGE',
      'El cuerpo de la petición supera el límite permitido.',
    );
  } else {
    failure = new ApiError(500, 'INTERNAL_ERROR', 'Error interno del servidor.');
    // No registrar errores originales: pueden incluir cuerpos, parámetros SQL o secretos.
    console.error('api.error', { code: failure.code, status: failure.status });
  }
  res.status(failure.status).json({ error: { code: failure.code, message: failure.message } });
};
