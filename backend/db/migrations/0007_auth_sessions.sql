ALTER TABLE users
  ADD COLUMN password_hash text,
  ADD COLUMN must_change_password boolean NOT NULL DEFAULT true,
  ADD COLUMN failed_login_attempts integer NOT NULL DEFAULT 0 CHECK (failed_login_attempts >= 0),
  ADD COLUMN locked_until timestamptz,
  ADD COLUMN last_login_at timestamptz,
  ADD COLUMN password_changed_at timestamptz,
  ADD COLUMN expires_at timestamptz;

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  ip inet,
  user_agent text
);

CREATE INDEX sessions_user_id_idx ON sessions (user_id);
CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);

COMMENT ON TABLE users IS 'Cuentas de empleados y cuentas temporales de auditoría, con un solo rol vigente.';
COMMENT ON COLUMN users.password_hash IS 'Argon2id; NULL impide iniciar sesión.';
COMMENT ON COLUMN users.must_change_password IS 'Restringe el acceso hasta cambiar la contraseña temporal.';
COMMENT ON COLUMN users.failed_login_attempts IS 'Intentos fallidos consecutivos para el bloqueo temporal.';
COMMENT ON COLUMN users.locked_until IS 'Fin del bloqueo temporal de inicio de sesión.';
COMMENT ON COLUMN users.expires_at IS 'Vencimiento de la cuenta; NULL significa que no vence.';
COMMENT ON TABLE sessions IS 'Sesiones opacas del servidor; no almacena tokens originales.';
COMMENT ON COLUMN sessions.token_hash IS 'SHA-256 del token aleatorio de la cookie.';
COMMENT ON COLUMN sessions.last_seen_at IS 'Actividad registrada como máximo una vez por minuto.';
COMMENT ON COLUMN sessions.expires_at IS 'Límite absoluto de duración, sin renovación deslizante.';
COMMENT ON COLUMN sessions.revoked_at IS 'Fecha de revocación; NULL indica que no se revocó.';
COMMENT ON COLUMN sessions.ip IS 'IP al iniciar sesión, según la configuración de proxies confiables.';
COMMENT ON COLUMN sessions.user_agent IS 'Metadato del cliente al iniciar sesión, sin autoridad para autenticarlo.';
