ALTER TABLE users
  ADD COLUMN auth_provider text NOT NULL DEFAULT 'local'
    CHECK (auth_provider IN ('local', 'directory')),
  ADD COLUMN created_by bigint REFERENCES users(id) ON DELETE RESTRICT,
  ADD COLUMN notes text,
  ADD COLUMN is_temporary boolean NOT NULL DEFAULT false,
  ADD CONSTRAINT users_directory_password_check
    CHECK (auth_provider <> 'directory' OR password_hash IS NULL),
  ADD CONSTRAINT users_temporary_expiration_check
    CHECK (NOT is_temporary OR (auth_provider = 'local' AND expires_at IS NOT NULL));

COMMENT ON COLUMN users.auth_provider IS 'Origen de las credenciales; directory todavía no admite inicio de sesión.';
COMMENT ON COLUMN users.created_by IS 'Administrador que creó la cuenta; NULL para cuentas anteriores o del sistema.';
COMMENT ON COLUMN users.notes IS 'Motivo o comentario administrativo; nunca credenciales.';
COMMENT ON COLUMN users.is_temporary IS 'Creada con temporary=true; debe conservar vencimiento y proveedor local.';
