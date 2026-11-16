ALTER TABLE tickets ADD COLUMN priority text NOT NULL DEFAULT 'media'
  CONSTRAINT tickets_priority_check CHECK (priority IN ('baja','media','alta','urgente'));
COMMENT ON COLUMN tickets.priority IS 'Prioridad operativa de soporte; media al crear, sin inferencia histórica ni reglas automáticas.';

ALTER TABLE ticket_events
  ADD COLUMN from_priority text CHECK (from_priority IN ('baja','media','alta','urgente')),
  ADD COLUMN to_priority text CHECK (to_priority IN ('baja','media','alta','urgente')),
  DROP CONSTRAINT ticket_events_event_type_check,
  DROP CONSTRAINT ticket_events_shape;
ALTER TABLE ticket_events
  ADD CONSTRAINT ticket_events_event_type_check CHECK (event_type IN ('created','assigned','reassigned','unassigned','status_changed','priority_changed')),
  ADD CONSTRAINT ticket_events_shape CHECK (
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
  );
COMMENT ON COLUMN ticket_events.from_priority IS 'Prioridad anterior; solo en priority_changed, sin reconstruir valores históricos.';
COMMENT ON COLUMN ticket_events.to_priority IS 'Prioridad nueva; solo en priority_changed.';
