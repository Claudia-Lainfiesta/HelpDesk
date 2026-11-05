export type Rol = 'solicitante' | 'agente' | 'supervisor' | 'administrador';
export interface Usuario {
  id: string;
  fullName: string;
  email: string;
  role: Rol;
  mustChangePassword: boolean;
  expiresAt: string | null;
}
