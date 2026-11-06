-- Una instalación vacía recibe su primer administrador mediante seed o la CLI.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM users) AND NOT EXISTS (
    SELECT 1 FROM users u JOIN roles r ON r.id = u.role_id
    WHERE u.auth_provider = 'local' AND r.code = 'administrador'
      AND u.is_active AND u.password_hash IS NOT NULL
      AND (u.expires_at IS NULL OR u.expires_at > now())
  ) THEN
    RAISE EXCEPTION 'Debe existir un administrador activo con contraseña antes de retirar cuentas antiguas.';
  END IF;
  IF EXISTS (SELECT 1 FROM users WHERE auth_provider = 'local' AND password_hash IS NULL) THEN
    RAISE EXCEPTION 'Hay cuentas que necesitan restablecer su contraseña antes de migrar.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM tickets t JOIN users u ON u.id = t.requester_id
    WHERE u.auth_provider = 'directory'
  ) THEN
    RAISE EXCEPTION 'Hay tickets de cuentas retiradas; revisa su conservación antes de migrar.';
  END IF;
END $$;

DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE auth_provider = 'directory');
UPDATE tickets SET assigned_agent_id = NULL
WHERE assigned_agent_id IN (SELECT id FROM users WHERE auth_provider = 'directory');
UPDATE users SET created_by = NULL
WHERE created_by IN (SELECT id FROM users WHERE auth_provider = 'directory');
-- Conserva el evento y el identificador original sin mantener una FK a una cuenta eliminada.
UPDATE audit_events SET metadata = metadata || jsonb_build_object('removedActorUserId', actor_user_id::text),
  actor_user_id = NULL
WHERE actor_user_id IN (SELECT id FROM users WHERE auth_provider = 'directory');
DELETE FROM users WHERE auth_provider = 'directory';

ALTER TABLE users DROP CONSTRAINT users_temporary_expiration_check;
ALTER TABLE users DROP COLUMN auth_provider;
ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;
ALTER TABLE users ADD CONSTRAINT users_temporary_expiration_check
  CHECK (NOT is_temporary OR expires_at IS NOT NULL);
COMMENT ON COLUMN users.password_hash IS 'Hash Argon2id obligatorio; nunca contiene la contraseña original.';
COMMENT ON COLUMN users.is_temporary IS 'Cuenta temporal con fecha de vencimiento obligatoria; independiente de la contraseña temporal.';
COMMENT ON COLUMN audit_events.actor_user_id IS 'Cuenta responsable; NULL para sistema o cuenta retirada cuyo ID se conserva en metadata.';
