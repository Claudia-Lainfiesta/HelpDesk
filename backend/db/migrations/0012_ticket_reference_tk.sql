-- PostgreSQL 17 recalcula la columna almacenada sin cambiar IDs, relaciones ni secuencia.
ALTER TABLE tickets ALTER COLUMN reference SET EXPRESSION AS (
  'TK-' || CASE WHEN id <= 999999 THEN lpad(id::text, 6, '0') ELSE id::text END
);
COMMENT ON COLUMN tickets.reference IS 'Identificador público TK- con al menos seis dígitos; conserva completo el número interno.';
ANALYZE tickets;
