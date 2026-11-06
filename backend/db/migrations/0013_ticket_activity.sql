CREATE TABLE ticket_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ticket_id bigint NOT NULL REFERENCES tickets(id) ON DELETE RESTRICT,
  event_type text NOT NULL CHECK (event_type IN ('created','assigned','reassigned','unassigned','status_changed')),
  actor_user_id bigint NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  from_status text REFERENCES ticket_statuses(code) ON DELETE RESTRICT,
  to_status text REFERENCES ticket_statuses(code) ON DELETE RESTRICT,
  from_agent_user_id bigint REFERENCES users(id) ON DELETE RESTRICT,
  to_agent_user_id bigint REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT ticket_events_shape CHECK (
    (event_type = 'created' AND from_status IS NULL AND to_status IS NULL AND from_agent_user_id IS NULL AND to_agent_user_id IS NULL)
    OR (event_type = 'status_changed' AND from_status IS NOT NULL AND to_status IS NOT NULL AND from_status <> to_status AND from_agent_user_id IS NULL AND to_agent_user_id IS NULL)
    OR (event_type = 'assigned' AND from_status IS NULL AND to_status IS NULL AND from_agent_user_id IS NULL AND to_agent_user_id IS NOT NULL)
    OR (event_type = 'reassigned' AND from_status IS NULL AND to_status IS NULL AND from_agent_user_id IS NOT NULL AND to_agent_user_id IS NOT NULL AND from_agent_user_id <> to_agent_user_id)
    OR (event_type = 'unassigned' AND from_status IS NULL AND to_status IS NULL AND from_agent_user_id IS NOT NULL AND to_agent_user_id IS NULL)
  )
);
CREATE INDEX ticket_events_ticket_date_idx ON ticket_events(ticket_id, created_at DESC, id DESC);
CREATE UNIQUE INDEX ticket_events_created_uidx ON ticket_events(ticket_id) WHERE event_type='created';
COMMENT ON TABLE ticket_events IS 'Actividad funcional estructurada; la API solo inserta y consulta, sin borrado ni edición.';
COMMENT ON COLUMN ticket_events.actor_user_id IS 'Actor real; para creación histórica se deduce del solicitante.';
COMMENT ON COLUMN ticket_events.from_status IS 'Código anterior, únicamente para cambios de estado conocidos.';
COMMENT ON COLUMN ticket_events.from_agent_user_id IS 'Asignación previa; no depende del rol actual del usuario histórico.';
COMMENT ON COLUMN ticket_events.created_at IS 'Instante del evento; en el backfill conserva la creación del ticket.';
INSERT INTO ticket_events(ticket_id,event_type,actor_user_id,created_at)
SELECT id,'created',requester_id,created_at FROM tickets;
UPDATE ticket_statuses SET description='La atención terminó con éxito; confirma el propietario o cierra supervisor/administrador.' WHERE code='cerrado';
UPDATE ticket_statuses SET description='Se decidió no continuar. Propietario, supervisor o administrador pueden cancelar desde creado o en espera.' WHERE code='cancelado';
COMMENT ON COLUMN tickets.status_id IS 'Creado al ingresar; las acciones y transiciones se validan transaccionalmente en la API.';
COMMENT ON COLUMN tickets.canceled_at IS 'Instante de cancelación; cancelado es terminal.';
