import { Cuenta, Categoria } from '../core/administracion/modelos';
export function cuentaPrueba(cambios: Partial<Cuenta> = {}): Cuenta {
  return {
    id: '25',
    fullName: 'Persona de prueba',
    email: 'persona@helpdesk.local',
    roleCode: 'agente',
    authProvider: 'local',
    isActive: true,
    mustChangePassword: false,
    expiresAt: null,
    temporary: false,
    expirationRequired: false,
    createdBy: '4',
    notes: null,
    createdAt: '2026-11-01T12:00:00Z',
    updatedAt: '2026-11-01T12:00:00Z',
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: null,
    passwordChangedAt: null,
    ...cambios,
  };
}
export function categoriaPrueba(cambios: Partial<Categoria> = {}): Categoria {
  return {
    id: '8',
    name: 'Categoría de prueba',
    description: 'Descripción de prueba',
    isActive: true,
    createdAt: '2026-11-01T12:00:00Z',
    updatedAt: '2026-11-01T12:00:00Z',
    ...cambios,
  };
}
