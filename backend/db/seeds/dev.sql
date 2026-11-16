INSERT INTO users (full_name, email, role_id, password_hash, must_change_password, password_changed_at)
SELECT sample.full_name, sample.email, roles.id, current_setting('helpdesk.seed_password_hash'), false, now()
FROM (VALUES
  ('Ana Solicitante', 'ana.solicitante@helpdesk.local', 'solicitante'),
  ('Bruno Agente', 'bruno.agente@helpdesk.local', 'agente'),
  ('Carla Supervisora', 'carla.supervisora@helpdesk.local', 'supervisor'),
  ('Diego Administrador', 'diego.administrador@helpdesk.local', 'administrador')
) AS sample(full_name, email, role_code)
JOIN roles ON roles.code = sample.role_code
ON CONFLICT DO NOTHING;

INSERT INTO categories (name, description) VALUES
  ('Hardware', 'Equipos y periféricos.'),
  ('Software', 'Aplicaciones y herramientas de trabajo.'),
  ('Redes e internet', 'Conectividad de la empresa.'),
  ('Accesos y cuentas', 'Accesos a recursos internos.'),
  ('Otros', 'Solicitudes de soporte general.')
ON CONFLICT DO NOTHING;

CREATE TEMP TABLE seed_ticket_ids ON COMMIT DROP AS
WITH inserted AS (
INSERT INTO tickets (
  subject, description, category_id, status_id, requester_id, assigned_agent_id,
  resolved_at, closed_at, canceled_at, created_at, updated_at, priority
)
SELECT sample.subject, sample.description, categories.id, ticket_statuses.id, requester.id,
  CASE WHEN sample.status_code = 'creado' AND sample.subject <> 'Ejemplo: solicitud asignada sin iniciar' THEN NULL ELSE agent.id END,
  CASE WHEN sample.status_code IN ('resuelto', 'cerrado') THEN now()-interval '5 minutes' ELSE NULL END,
  CASE WHEN sample.status_code = 'cerrado' THEN now()-interval '4 minutes' ELSE NULL END,
  CASE WHEN sample.status_code = 'cancelado' THEN now()-interval '4 minutes' ELSE NULL END,
  now()-interval '10 minutes', now(), sample.priority
FROM (VALUES
  ('Ejemplo: teclado sin respuesta', 'El teclado de la estación de trabajo no responde.', 'Hardware', 'creado', 'baja'),
  ('Ejemplo: aplicación no abre', 'La herramienta de trabajo se cierra al iniciar.', 'Software', 'en_proceso', 'alta'),
  ('Ejemplo: conexión intermitente', 'La conexión se interrumpe; se espera una prueba del solicitante.', 'Redes e internet', 'en_espera', 'urgente'),
  ('Ejemplo: acceso restablecido', 'Se restableció el acceso; se espera confirmación del solicitante.', 'Accesos y cuentas', 'resuelto', 'media'),
  ('Ejemplo: consulta atendida', 'Se atendió la consulta y el solicitante confirmó el cierre.', 'Otros', 'cerrado', 'alta'),
  ('Ejemplo: solicitud asignada sin iniciar', 'El agente está asignado y aún no ha iniciado atención.', 'Hardware', 'creado', 'media'),
  ('Ejemplo: solicitud registrada por error', 'Se decidió no continuar porque la solicitud se registró por error.', 'Otros', 'cancelado', 'baja')
) AS sample(subject, description, category_name, status_code, priority)
JOIN categories ON lower(categories.name) = lower(sample.category_name)
JOIN ticket_statuses ON ticket_statuses.code = sample.status_code
JOIN users requester ON lower(requester.email) = CASE WHEN sample.status_code IN ('creado', 'en_espera', 'cerrado') THEN 'ana.solicitante@helpdesk.local' ELSE 'carla.supervisora@helpdesk.local' END
JOIN users agent ON lower(agent.email) = 'bruno.agente@helpdesk.local'
-- No se agrega una clave de negocio artificial solo para identificar ejemplos del seed.
WHERE NOT EXISTS (
  SELECT 1 FROM tickets
  WHERE tickets.subject = sample.subject AND tickets.requester_id = requester.id
)
ORDER BY ticket_statuses.sort_order
ON CONFLICT DO NOTHING
RETURNING id
) SELECT id FROM inserted;

-- Cronología ficticia solo para los ejemplos insertados en esta ejecución.
-- No se reconstruye ni se modifica la historia de ejemplos existentes.
INSERT INTO ticket_events(ticket_id,event_type,actor_user_id,from_status,to_status,from_agent_user_id,to_agent_user_id,created_at)
SELECT t.id,step.type,
  CASE WHEN step.type='created' OR step.to_status IN ('cerrado','cancelado') THEN t.requester_id
       WHEN step.type='assigned' THEN (SELECT id FROM users WHERE email='carla.supervisora@helpdesk.local')
       ELSE t.assigned_agent_id END,
  step.from_status,step.to_status,NULL,
  CASE WHEN step.type='assigned' THEN t.assigned_agent_id ELSE NULL END,
  t.created_at+step.minutes*interval '1 minute'
FROM seed_ticket_ids n JOIN tickets t ON t.id=n.id JOIN ticket_statuses s ON s.id=t.status_id
CROSS JOIN LATERAL (
  SELECT 0 AS minutes,'created' AS type,NULL::text AS from_status,NULL::text AS to_status
  UNION ALL SELECT 1,'assigned',NULL,NULL WHERE t.assigned_agent_id IS NOT NULL
  UNION ALL SELECT 2,'status_changed','creado','en_proceso' WHERE s.code IN ('en_proceso','en_espera','resuelto','cerrado')
  UNION ALL SELECT 3,'status_changed','en_proceso','en_espera' WHERE s.code='en_espera'
  UNION ALL SELECT 5,'status_changed','en_proceso','resuelto' WHERE s.code IN ('resuelto','cerrado')
  UNION ALL SELECT 6,'status_changed','resuelto','cerrado' WHERE s.code='cerrado'
  UNION ALL SELECT 6,'status_changed','creado','cancelado' WHERE s.code='cancelado'
) step ORDER BY t.id,step.minutes;

WITH notes AS (
  INSERT INTO ticket_notes(ticket_id,author_user_id,body,created_at)
  SELECT t.id,t.assigned_agent_id,
    CASE s.code
      WHEN 'en_proceso' THEN 'Se contactó al solicitante por Telegram. Se está comprobando la instalación de la aplicación.'
      WHEN 'en_espera' THEN 'Se espera que el solicitante pruebe nuevamente la conexión después de reiniciar el adaptador de red.'
      WHEN 'resuelto' THEN 'Se restableció el acceso y se comprobó su funcionamiento. Se espera la confirmación del solicitante.'
    END,
    t.created_at + CASE s.code WHEN 'en_proceso' THEN 3 WHEN 'en_espera' THEN 4 ELSE 6 END * interval '1 minute'
  FROM seed_ticket_ids n JOIN tickets t ON t.id=n.id JOIN ticket_statuses s ON s.id=t.status_id
  WHERE s.code IN ('en_proceso','en_espera','resuelto')
  RETURNING id,ticket_id,author_user_id,created_at
)
INSERT INTO ticket_events(ticket_id,event_type,actor_user_id,note_id,created_at)
SELECT ticket_id,'note_added',author_user_id,id,created_at FROM notes;

INSERT INTO users (full_name,email,role_id,password_hash,must_change_password,is_temporary,expires_at,notes)
SELECT 'Auditoría temporal','auditoria.temporal@helpdesk.local',id,
  current_setting('helpdesk.seed_password_hash'),false,true,now()+interval '7 days','Cuenta temporal de desarrollo.'
FROM roles WHERE code='solicitante'
ON CONFLICT DO NOTHING;
