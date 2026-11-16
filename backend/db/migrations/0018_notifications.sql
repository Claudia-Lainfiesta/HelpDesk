CREATE TABLE notifications (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  type text NOT NULL CHECK (type IN ('ticket_assigned','ticket_reassigned','ticket_waiting','ticket_resolved','ticket_reopened','ticket_closed','priority_changed')),
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 160),
  message text NOT NULL CHECK (length(btrim(message)) BETWEEN 1 AND 500),
  ticket_id bigint REFERENCES tickets(id) ON DELETE RESTRICT,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_unread_idx ON notifications(user_id) WHERE read_at IS NULL;
CREATE INDEX notifications_user_created_idx ON notifications(user_id,created_at DESC,id DESC);
COMMENT ON TABLE notifications IS 'Avisos personales persistentes; la aplicación solo modifica read_at.';
COMMENT ON COLUMN notifications.read_at IS 'Primera lectura; NULL significa no leída.';
COMMENT ON COLUMN notifications.ticket_id IS 'Destino opcional; no contiene el expediente ni notas internas.';
