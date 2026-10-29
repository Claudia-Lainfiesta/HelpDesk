\set ON_ERROR_STOP on
BEGIN;

DO $$
DECLARE
  requester bigint;
  category bigint;
  role smallint;
  generated_reference text;
  default_status smallint;
  changed_at timestamptz;
BEGIN
  SELECT id, role_id INTO STRICT requester, role
  FROM users WHERE lower(email) = 'ana.solicitante@helpdesk.local';
  SELECT id INTO STRICT category FROM categories WHERE name = 'Hardware';

  BEGIN
    INSERT INTO users (full_name, email, role_id)
    VALUES ('Correo duplicado', 'ANA.SOLICITANTE@HELPDESK.LOCAL', role);
    RAISE EXCEPTION 'FALLO: se aceptó un correo duplicado con otra capitalización.';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'OK: correo duplicado rechazado (23505).';
  END;

  BEGIN
    INSERT INTO users (full_name, email) VALUES ('Sin rol', 'sin.rol@helpdesk.local');
    RAISE EXCEPTION 'FALLO: se aceptó un usuario sin role_id.';
  EXCEPTION WHEN not_null_violation THEN
    RAISE NOTICE 'OK: usuario sin role_id rechazado (23502).';
  END;

  BEGIN
    DELETE FROM roles WHERE id = role;
    RAISE EXCEPTION 'FALLO: se eliminó un rol en uso.';
  EXCEPTION WHEN foreign_key_violation THEN
    RAISE NOTICE 'OK: borrado de rol en uso rechazado (23503).';
  END;

  BEGIN
    INSERT INTO tickets (subject, description, category_id, requester_id)
    VALUES ('   ', 'Descripción válida', category, requester);
    RAISE EXCEPTION 'FALLO: se aceptó un asunto vacío.';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'OK: asunto vacío rechazado (23514).';
  END;

  BEGIN
    INSERT INTO tickets (subject, description, category_id, requester_id)
    VALUES ('Asunto válido', '   ', category, requester);
    RAISE EXCEPTION 'FALLO: se aceptó una descripción vacía.';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'OK: descripción vacía rechazada (23514).';
  END;

  BEGIN
    INSERT INTO categories (name) VALUES ('HARDWARE');
    RAISE EXCEPTION 'FALLO: se aceptó una categoría duplicada.';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'OK: categoría duplicada rechazada (23505).';
  END;

  INSERT INTO tickets (id, subject, description, category_id, requester_id)
  OVERRIDING SYSTEM VALUE VALUES
    (1000001, 'Prueba de referencia larga', 'Se revierte al terminar.', category, requester)
  RETURNING reference, status_id INTO generated_reference, default_status;

  IF generated_reference <> 'TK-1000001' THEN
    RAISE EXCEPTION 'FALLO: referencia larga incorrecta: %', generated_reference;
  END IF;
  IF default_status <> (SELECT id FROM ticket_statuses WHERE code = 'creado') THEN
    RAISE EXCEPTION 'FALLO: el estado predeterminado no es creado.';
  END IF;
  RAISE NOTICE 'OK: id 1000001 genera %, sin recortar; estado predeterminado creado.', generated_reference;

  UPDATE tickets SET status_id = (SELECT id FROM ticket_statuses WHERE code = 'resuelto')
  WHERE id = 1000001;
  RAISE NOTICE 'OK: transición directa creado a resuelto permitida.';

  UPDATE users SET updated_at = '2000-01-01T00:00:00Z' WHERE id = requester
  RETURNING updated_at INTO changed_at;
  IF changed_at <> now() THEN
    RAISE EXCEPTION 'FALLO: el trigger no actualizó updated_at.';
  END IF;
  RAISE NOTICE 'OK: trigger set_updated_at verificado.';
END;
$$;

SELECT id, reference FROM tickets WHERE id = 1000001;
ROLLBACK;

SELECT NOT EXISTS (SELECT 1 FROM tickets WHERE id = 1000001) AS prueba_revertida;
