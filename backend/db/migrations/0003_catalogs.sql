CREATE TABLE categories (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL CHECK (btrim(name) <> ''),
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX categories_name_lower_uidx ON categories (lower(name));

CREATE TRIGGER categories_set_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE ticket_statuses (
  id smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  sort_order smallint NOT NULL,
  is_final boolean NOT NULL DEFAULT false
);

INSERT INTO ticket_statuses (id, code, name, description, sort_order, is_final)
OVERRIDING SYSTEM VALUE VALUES
  (1, 'creado', 'Creado', 'El ticket acaba de ser creado o ingresado al sistema, pero ningún agente ha comenzado a revisarlo.', 1, false),
  (2, 'en_proceso', 'En proceso', 'Un agente fue asignado y trabaja activamente en la solución.', 2, false),
  (3, 'en_espera', 'En espera', 'Ticket pausado temporalmente: falta información, pruebas o respuesta del usuario.', 3, false),
  (4, 'resuelto', 'Resuelto', 'El técnico aplicó una solución y espera la confirmación o el cierre por parte del usuario.', 4, false),
  (5, 'cerrado', 'Cerrado', 'El problema quedó solucionado y el usuario confirmó que no necesita más asistencia.', 5, true);

SELECT setval(pg_get_serial_sequence('ticket_statuses', 'id'), 5);

COMMENT ON TABLE categories IS 'Categorías de soporte configurables; sin datos iniciales de negocio.';
COMMENT ON COLUMN categories.name IS 'Nombre único sin distinguir mayúsculas.';
COMMENT ON COLUMN categories.is_active IS 'Permite deshabilitar una categoría sin perder tickets relacionados.';
COMMENT ON TABLE ticket_statuses IS 'Catálogo de estados; las transiciones se validarán en la aplicación.';
COMMENT ON COLUMN ticket_statuses.id IS 'IDs fijos del catálogo inicial; 1 corresponde a creado.';
COMMENT ON COLUMN ticket_statuses.code IS 'Identificador estable del estado usado por la aplicación.';
COMMENT ON COLUMN ticket_statuses.sort_order IS 'Orden de presentación; no impone una secuencia de transiciones.';
COMMENT ON COLUMN ticket_statuses.is_final IS 'Solo cerrado es un estado final.';
