import type { RequestHandler } from 'express';
import type { AuthConfig } from './config.js';
import { ApiError, authenticationRequired } from './errors.js';
import type { RoleCode } from './types.js';

export const enforcePasswordChange: RequestHandler = (req, _res, next) => {
  const allowed = new Set([
    'GET /api/auth/me',
    'POST /api/auth/logout',
    'POST /api/auth/change-password',
  ]);
  if (
    req.auth?.user.mustChangePassword &&
    !allowed.has(`${req.method} ${req.baseUrl}${req.path}`)
  ) {
    next(new ApiError(403, 'PASSWORD_CHANGE_REQUIRED', 'Debes cambiar la contraseña temporal.'));
    return;
  }
  next();
};

export const requireAuth: RequestHandler = (req, res, next) => {
  if (!req.auth) {
    next(authenticationRequired());
    return;
  }
  enforcePasswordChange(req, res, next);
};

export function requireRole(...roles: RoleCode[]): RequestHandler {
  return (req, res, next) => {
    requireAuth(req, res, (error?: unknown) => {
      if (error) {
        next(error);
        return;
      }
      if (!roles.includes(req.auth!.user.role)) {
        next(new ApiError(403, 'FORBIDDEN', 'No tienes permiso para esta operación.'));
        return;
      }
      next();
    });
  };
}

export function csrfProtection(config: AuthConfig): RequestHandler {
  return (req, _res, next) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      next();
      return;
    }
    let origin = req.get('Origin');
    if (origin === undefined && req.get('Referer')) {
      try {
        origin = new URL(req.get('Referer')!).origin;
      } catch {
        origin = undefined;
      }
    }
    if (origin !== config.frontendOrigin) {
      next(new ApiError(403, 'CSRF_REJECTED', 'El origen de la petición no está permitido.'));
      return;
    }
    if (!req.is('application/json')) {
      next(new ApiError(415, 'JSON_REQUIRED', 'El cuerpo debe ser application/json.'));
      return;
    }
    next();
  };
}
