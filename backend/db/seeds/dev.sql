INSERT INTO users (full_name, email, role_id)
SELECT sample.full_name, sample.email, roles.id
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

INSERT INTO tickets (
  subject, description, category_id, status_id, requester_id, assigned_agent_id,
  resolved_at, closed_at
)
SELECT sample.subject, sample.description, categories.id, ticket_statuses.id, requester.id,
  CASE WHEN sample.status_code = 'creado' THEN NULL ELSE agent.id END,
  CASE WHEN sample.status_code IN ('resuelto', 'cerrado') THEN now() ELSE NULL END,
  CASE WHEN sample.status_code = 'cerrado' THEN now() ELSE NULL END
FROM (VALUES
  ('Ejemplo: teclado sin respuesta', 'El teclado de la estación de trabajo no responde.', 'Hardware', 'creado'),
  ('Ejemplo: aplicación no abre', 'La herramienta de trabajo se cierra al iniciar.', 'Software', 'en_proceso'),
  ('Ejemplo: conexión intermitente', 'La conexión se interrumpe; se espera una prueba del solicitante.', 'Redes e internet', 'en_espera'),
  ('Ejemplo: acceso restablecido', 'Se restableció el acceso; se espera confirmación del solicitante.', 'Accesos y cuentas', 'resuelto'),
  ('Ejemplo: consulta atendida', 'Se atendió la consulta y el solicitante confirmó el cierre.', 'Otros', 'cerrado'),
  ('Ejemplo: solicitud registrada por error', 'Se decidió no continuar porque la solicitud se registró por error.', 'Otros', 'cancelado')
) AS sample(subject, description, category_name, status_code)
JOIN categories ON lower(categories.name) = lower(sample.category_name)
JOIN ticket_statuses ON ticket_statuses.code = sample.status_code
JOIN users requester ON lower(requester.email) = 'ana.solicitante@helpdesk.local'
JOIN users agent ON lower(agent.email) = 'bruno.agente@helpdesk.local'
-- No se agrega una clave de negocio artificial solo para identificar ejemplos del seed.
WHERE NOT EXISTS (
  SELECT 1 FROM tickets
  WHERE tickets.subject = sample.subject AND tickets.requester_id = requester.id
)
ORDER BY ticket_statuses.sort_order
ON CONFLICT DO NOTHING;
