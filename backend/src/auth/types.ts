export type RoleCode = 'solicitante' | 'agente' | 'supervisor' | 'administrador';

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: RoleCode;
  mustChangePassword: boolean;
  expiresAt: string | null;
}

export interface AuthSession {
  sessionId: string;
  user: UserProfile;
}

export interface UserRow {
  id: string;
  full_name: string;
  email: string;
  role: RoleCode;
  password_hash: string | null;
  must_change_password: boolean;
  failed_login_attempts: number;
  locked_until: Date | null;
  is_active: boolean;
  expires_at: Date | null;
}

export function userProfile(user: UserRow): UserProfile {
  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    role: user.role,
    mustChangePassword: user.must_change_password,
    expiresAt: user.expires_at?.toISOString() ?? null,
  };
}
