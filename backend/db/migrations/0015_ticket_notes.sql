CREATE TABLE ticket_notes (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ticket_id bigint NOT NULL REFERENCES tickets(id) ON DELETE RESTRICT,
  author_user_id bigint NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 5000),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX ticket_notes_ticket_created_idx ON ticket_notes(ticket_id, created_at);
COMMENT ON TABLE ticket_notes IS 'Notas internas inmutables; no son mensajes al solicitante ni copias automáticas de Telegram.';
COMMENT ON COLUMN ticket_notes.body IS 'Texto plano; solo visible para el agente asignado, supervisor y administrador.';

ALTER TABLE ticket_events
  ADD COLUMN note_id bigint REFERENCES ticket_notes(id) ON DELETE RESTRICT,
  DROP CONSTRAINT ticket_events_event_type_check,
  DROP CONSTRAINT ticket_events_shape;
ALTER TABLE ticket_events
  ADD CONSTRAINT ticket_events_event_type_check CHECK (event_type IN ('created','assigned','reassigned','unassigned','status_changed','priority_changed','note_added')),
  ADD CONSTRAINT ticket_events_shape CHECK (
    (event_type='note_added' AND note_id IS NOT NULL
      AND from_priority IS NULL AND to_priority IS NULL AND from_status IS NULL AND to_status IS NULL
      AND from_agent_user_id IS NULL AND to_agent_user_id IS NULL)
    OR (note_id IS NULL AND (
      (event_type='priority_changed'
        AND from_priority IS NOT NULL AND to_priority IS NOT NULL AND from_priority<>to_priority
        AND from_status IS NULL AND to_status IS NULL AND from_agent_user_id IS NULL AND to_agent_user_id IS NULL)
      OR (from_priority IS NULL AND to_priority IS NULL AND (
        (event_type='created' AND from_status IS NULL AND to_status IS NULL AND from_agent_user_id IS NULL AND to_agent_user_id IS NULL)
        OR (event_type='status_changed' AND from_status IS NOT NULL AND to_status IS NOT NULL AND from_status<>to_status AND from_agent_user_id IS NULL AND to_agent_user_id IS NULL)
        OR (event_type='assigned' AND from_status IS NULL AND to_status IS NULL AND from_agent_user_id IS NULL AND to_agent_user_id IS NOT NULL)
        OR (event_type='reassigned' AND from_status IS NULL AND to_status IS NULL AND from_agent_user_id IS NOT NULL AND to_agent_user_id IS NOT NULL AND from_agent_user_id<>to_agent_user_id)
        OR (event_type='unassigned' AND from_status IS NULL AND to_status IS NULL AND from_agent_user_id IS NOT NULL AND to_agent_user_id IS NULL)
      ))
    ))
  );
COMMENT ON COLUMN ticket_events.note_id IS 'Nota interna asociada a note_added; el contenido no se duplica en el evento.';
