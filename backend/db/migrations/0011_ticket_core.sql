-- Evoluciona la tabla existente; el identity ya genera números únicos concurrentes.
ALTER TABLE tickets DROP COLUMN reference;
ALTER TABLE tickets ADD COLUMN reference text GENERATED ALWAYS AS (
  'HD-' || CASE WHEN id <= 999999 THEN lpad(id::text, 6, '0') ELSE id::text END
) STORED;
CREATE UNIQUE INDEX tickets_reference_uidx ON tickets (reference);
ALTER TABLE tickets ADD COLUMN canceled_at timestamptz;
ALTER TABLE tickets ADD CONSTRAINT tickets_subject_length_check CHECK (char_length(btrim(subject)) BETWEEN 1 AND 160);
ALTER TABLE tickets ADD CONSTRAINT tickets_description_length_check CHECK (char_length(btrim(description)) BETWEEN 1 AND 5000);
ALTER TABLE ticket_statuses ADD CONSTRAINT ticket_statuses_code_check
  CHECK (code IN ('creado', 'en_proceso', 'en_espera', 'resuelto', 'cerrado', 'cancelado'));
CREATE INDEX tickets_requester_created_idx ON tickets (requester_id, created_at DESC, id DESC);
DROP INDEX tickets_created_at_desc_idx;
CREATE INDEX tickets_created_id_desc_idx ON tickets (created_at DESC, id DESC);
COMMENT ON COLUMN tickets.reference IS 'Número público HD- con al menos seis dígitos, generado desde el identity sin truncar.';
COMMENT ON COLUMN tickets.canceled_at IS 'Fecha de cancelación; las operaciones de estados se implementarán posteriormente.';
COMMENT ON COLUMN ticket_statuses.is_final IS 'Cerrado y cancelado son estados finales.';
