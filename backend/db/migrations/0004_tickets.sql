CREATE TABLE tickets (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reference text GENERATED ALWAYS AS (
    'TK-' || CASE
      WHEN id <= 999999 THEN lpad(id::text, 6, '0')
      ELSE id::text
    END
  ) STORED,
  subject text NOT NULL CHECK (btrim(subject) <> ''),
  description text NOT NULL CHECK (btrim(description) <> ''),
  category_id bigint NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  status_id smallint NOT NULL DEFAULT 1 REFERENCES ticket_statuses(id) ON DELETE RESTRICT,
  requester_id bigint NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_agent_id bigint REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  closed_at timestamptz
);

CREATE UNIQUE INDEX tickets_reference_uidx ON tickets (reference);
CREATE INDEX tickets_requester_id_idx ON tickets (requester_id);
CREATE INDEX tickets_assigned_agent_id_idx ON tickets (assigned_agent_id);
CREATE INDEX tickets_status_id_idx ON tickets (status_id);
CREATE INDEX tickets_category_id_idx ON tickets (category_id);
CREATE INDEX tickets_created_at_desc_idx ON tickets (created_at DESC);

CREATE TRIGGER tickets_set_updated_at
BEFORE UPDATE ON tickets
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE tickets IS 'Solicitudes de soporte interno; sus relaciones no permiten borrado en cascada.';
COMMENT ON COLUMN tickets.reference IS 'Referencia calculada: TK- más al menos seis dígitos, sin truncar IDs mayores.';
COMMENT ON COLUMN tickets.status_id IS 'Por defecto 1 (creado); no hay restricciones de transición en la base.';
COMMENT ON COLUMN tickets.requester_id IS 'Empleado que solicita asistencia.';
COMMENT ON COLUMN tickets.assigned_agent_id IS 'Empleado asignado; puede estar vacío. La aplicación validará su rol.';
COMMENT ON COLUMN tickets.resolved_at IS 'Fecha de resolución; la aplicación es responsable de actualizarla.';
COMMENT ON COLUMN tickets.closed_at IS 'Fecha de cierre confirmado; la aplicación es responsable de actualizarla.';
