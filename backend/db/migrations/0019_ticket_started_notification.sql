ALTER TABLE notifications
  DROP CONSTRAINT notifications_type_check,
  ADD CONSTRAINT notifications_type_check CHECK (type IN (
    'ticket_assigned', 'ticket_reassigned', 'ticket_started', 'ticket_waiting',
    'ticket_resolved', 'ticket_reopened', 'ticket_closed', 'priority_changed'
  ));
