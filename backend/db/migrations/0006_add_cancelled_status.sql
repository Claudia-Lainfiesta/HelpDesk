INSERT INTO ticket_statuses (code, name, description, sort_order, is_final)
VALUES (
  'cancelado',
  'Cancelado',
  'Se decidió no continuar con el ticket porque ocurrió algo que lo impide (por ejemplo, se registró por error). Solo el supervisor puede cancelar.',
  6,
  true
)
ON CONFLICT (code) DO NOTHING;

COMMENT ON COLUMN ticket_statuses.is_final IS 'Cerrado y cancelado son estados finales.';
