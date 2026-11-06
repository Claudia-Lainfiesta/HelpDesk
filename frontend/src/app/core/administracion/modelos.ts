import { Rol } from '../auth/modelos';

export type Proveedor = 'local' | 'directory';
export interface Cuenta {
  id: string;
  fullName: string;
  email: string;
  roleCode: Rol;
  authProvider: Proveedor;
  isActive: boolean;
  mustChangePassword: boolean;
  expiresAt: string | null;
  temporary: boolean;
  expirationRequired: boolean;
  createdBy: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  lastLoginAt: string | null;
  passwordChangedAt: string | null;
}
export interface AltaCuenta {
  fullName: string;
  email: string;
  roleCode: Rol;
  authProvider?: Proveedor;
  temporary?: boolean;
  expiresAt?: string | null;
  notes?: string | null;
}
export type CambioCuenta = Partial<Pick<Cuenta, 'fullName' | 'roleCode' | 'expiresAt' | 'notes'>>;
export interface CuentaConClave extends Cuenta {
  temporaryPassword?: string;
}
export interface FiltrosUsuarios {
  page: number;
  pageSize: number;
  q?: string;
  role?: Rol;
  active?: boolean;
  provider?: Proveedor;
  temporary?: boolean;
  expired?: boolean;
}
export interface Pagina<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}
export interface Categoria {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface AltaCategoria {
  name: string;
  description?: string | null;
  isActive?: boolean;
}
export const roles: { valor: Rol; etiqueta: string }[] = [
  { valor: 'solicitante', etiqueta: 'Solicitante' },
  { valor: 'agente', etiqueta: 'Agente' },
  { valor: 'supervisor', etiqueta: 'Supervisor' },
  { valor: 'administrador', etiqueta: 'Administrador' },
];
