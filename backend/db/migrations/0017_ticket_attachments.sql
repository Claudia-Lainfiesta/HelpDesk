CREATE TABLE ticket_attachments (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ticket_id bigint NOT NULL UNIQUE REFERENCES tickets(id) ON DELETE RESTRICT,
  original_filename text NOT NULL CHECK (char_length(original_filename) BETWEEN 1 AND 255),
  mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/webp')),
  size_bytes integer NOT NULL CHECK (size_bytes BETWEEN 1 AND 10485760),
  data bytea NOT NULL CHECK (octet_length(data)=size_bytes),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
COMMENT ON TABLE ticket_attachments IS 'Una imagen opcional al crear el ticket; sin alta, reemplazo ni eliminación posteriores desde la aplicación.';
COMMENT ON COLUMN ticket_attachments.original_filename IS 'Metadata saneada, nunca una ruta; el tipo se comprueba mediante contenido.';
COMMENT ON COLUMN ticket_attachments.data IS 'JPEG, PNG o WebP original, máximo 10 MiB; no se incluye en representaciones JSON.';
