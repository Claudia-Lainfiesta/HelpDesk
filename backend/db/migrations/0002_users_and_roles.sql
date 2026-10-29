CREATE TABLE roles (
  id smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL
);

INSERT INTO roles (code, name, description) VALUES
  ('solicitante', 'Solicitante', 'Empleado que solicita asistencia interna.'),
  ('agente', 'Agente', 'Empleado que atiende y resuelve solicitudes.'),
  ('supervisor', 'Supervisor', 'Empleado que supervisa la atención del soporte.'),
  ('administrador', 'Administrador', 'Empleado que administra el sistema.');

CREATE TABLE users (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  full_name text NOT NULL CHECK (btrim(full_name) <> ''),
  email text NOT NULL CHECK (btrim(email) <> ''),
  role_id smallint NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX users_email_lower_uidx ON users (lower(email));
CREATE INDEX users_role_id_idx ON users (role_id);

CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE roles IS 'Catálogo fijo de roles de empleados.';
COMMENT ON COLUMN roles.code IS 'Identificador estable del rol usado por la aplicación.';
COMMENT ON TABLE users IS 'Empleados de la empresa; sin credenciales de autenticación en Sprint 0.';
COMMENT ON COLUMN users.role_id IS 'Cada empleado tiene exactamente un rol a la vez.';
COMMENT ON COLUMN users.email IS 'Único sin distinguir mayúsculas mediante un índice sobre lower(email).';
COMMENT ON COLUMN users.is_active IS 'Permite desactivar al empleado conservando sus relaciones.';
