CREATE TABLE audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor_user_id bigint REFERENCES users(id) ON DELETE RESTRICT,
  action text NOT NULL,
  target_type text,
  target_id bigint,
  metadata jsonb NOT NULL DEFAULT '{}',
  ip inet
);

CREATE INDEX audit_events_occurred_at_idx ON audit_events (occurred_at);
CREATE INDEX audit_events_target_idx ON audit_events (target_type, target_id);

COMMENT ON TABLE audit_events IS 'Eventos administrativos anexados por la aplicación; no se actualizan ni se borran.';
COMMENT ON COLUMN audit_events.actor_user_id IS 'Cuenta responsable; NULL para acciones del sistema.';
COMMENT ON COLUMN audit_events.action IS 'Identificador estable de la acción realizada.';
COMMENT ON COLUMN audit_events.target_type IS 'Tipo de entidad afectada.';
COMMENT ON COLUMN audit_events.target_id IS 'Identificador de la entidad; no es una FK polimórfica.';
COMMENT ON COLUMN audit_events.metadata IS 'Solo cambios estructurados permitidos; nunca contraseñas, hashes, tokens ni texto libre.';
COMMENT ON COLUMN audit_events.ip IS 'IP del actor según los proxies confiables configurados.';
