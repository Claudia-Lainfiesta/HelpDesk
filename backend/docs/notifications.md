# Notificaciones personales y avisos al grupo

Son dos canales independientes. La web informa a una persona y conserva historial
privado. El grupo de soporte recibe avisos operativos generales; no es una copia
de la bandeja web ni un canal de seguimiento del caso.

## Web: persistencia y reglas

0018_notifications.sql crea `notifications`: ID bigint identity, `user_id` obligatorio,
`type` cerrado, `title`, `message`, `ticket_id` opcional, `read_at` nullable y
`created_at` timestamptz. FK a users/tickets con ON DELETE RESTRICT. Índices para
no leídas por usuario y para listado `(user_id, created_at DESC, id DESC)`.
0019_ticket_started_notification.sql amplía el CHECK con `ticket_started`, sin reescribir la 0018 ni alterar avisos existentes.
Solo se modifica `read_at`; no hay edición, borrado ni limpieza automática.

| Evento                                                                      | Tipo web            | Destinatario    | Grupo Telegram |
| --------------------------------------------------------------------------- | ------------------- | --------------- | -------------- |
| Crear ticket propio                                                         | Ninguno             | Ninguno         | Nuevo ticket   |
| Sin agente → agente                                                         | `ticket_assigned`   | Nuevo agente    | Asignado       |
| Agente A → B                                                                | `ticket_reassigned` | Nuevo agente B  | Reasignado     |
| Creado → En proceso (`start`)                                               | `ticket_started`    | Propietario     | No             |
| Desasignar                                                                  | Ninguno             | Ninguno         | No             |
| En proceso → En espera (`wait`)                                             | `ticket_waiting`    | Propietario     | No             |
| En proceso/En espera → Resuelto (`resolve`)                                 | `ticket_resolved`   | Propietario     | No             |
| Resuelto → En proceso (`reopen`)                                            | `ticket_reopened`   | Agente asignado | No             |
| Resuelto → Cerrado (`close`)                                                | `ticket_closed`     | Agente asignado | No             |
| Cualquier prioridad distinta → Urgente                                      | `priority_changed`  | Agente asignado | Urgente        |
| Resume, cancel, notas, imágenes, contacto directo, lectura o administración | Ninguno             | Ninguno         | No             |

Siempre se omite la notificación web si actor y destinatario son iguales o si
no hay destinatario. La reapertura usa texto neutro, también cuando la realiza
supervisor/administrador. Los mensajes web identifican el ticket sin descripción
ni asunto. No se notifica al antiguo agente al reasignar.

El INSERT de la notificación comparte la transacción del ticket, actividad y
auditoría: un fallo hace rollback de todo. Cada mutación llama una sola vez al
generador; el bloqueo del ticket y los conflictos existentes impiden duplicados
por asignación idéntica/transición inválida/prioridad sin cambios. No hay claves
de idempotencia: una nueva creación HTTP sigue siendo una nueva creación.

## Endpoints personales

Todos requieren sesión válida y contraseña definitiva, cualquier rol. El usuario
sale exclusivamente de la sesión. Respuestas `Cache-Control: no-store`.

| Método | Ruta                              | Entrada y respuesta                                                                                     |
| ------ | --------------------------------- | ------------------------------------------------------------------------------------------------------- |
| GET    | `/api/notifications/unread-count` | `{ "count": 4 }`                                                                                        |
| GET    | `/api/notifications`              | `page=1`, `pageSize=20` (1–100), `unreadOnly=false`; `{ items, pagination: { page, pageSize, total } }` |
| PATCH  | `/api/notifications/:id/read`     | JSON `{}`; 204; solo dueño, inexistente/ajena 404 `NOTIFICATION_NOT_FOUND`                              |
| POST   | `/api/notifications/read-all`     | JSON `{}`; 204; solo no leídas del usuario actual                                                       |

Ejemplo de elemento de listado:

```json
{
  "id": "123",
  "type": "ticket_assigned",
  "title": "Nuevo ticket asignado",
  "message": "Te asignaron el ticket TK-000020.",
  "ticketId": "20",
  "ticketNumber": "TK-000020",
  "readAt": null,
  "createdAt": "2026-11-16T10:00:00.000Z"
}
```

Orden `created_at DESC, id DESC`; count/página se leen en un snapshot consistente.
Sin notificaciones: items vacío y total cero. Destino nullable. Marcar es
idempotente: conserva la fecha de primera lectura. No se acepta `userId` ni
campos de edición. Queries/cuerpos inválidos: 400 `INVALID_INPUT`; sin sesión,
401; contraseña temporal, 403 `PASSWORD_CHANGE_REQUIRED`; escrituras conservan
CSRF y JSON. Abrir el ticket sigue aplicando sus permisos actuales.

## Telegram: dos usos distintos

- **Contacto directo:** «Hablar por Telegram» abre el `@username` público del
  agente asignado con borrador. Se conserva su flujo y sus permisos; no usa bot.
- **Bot del grupo:** `TelegramNotificationsService` envía únicamente los cuatro
  avisos generales de la tabla. No lee mensajes ni conversa con personas.

Se usa `fetch` de Node y [sendMessage oficial](https://core.telegram.org/bots/api#sendmessage),
POST JSON, texto plano sin parse_mode y vistas previas de enlaces desactivadas.
No se añade SDK, runner ni polling.

Variables opcionales en `.env.example`, sin valores secretos:

```dotenv
TELEGRAM_BOT_TOKEN=
TELEGRAM_SUPPORT_CHAT_ID=
```

El chat ID debe ser el identificador numérico negativo del grupo/supergrupo,
no un username ni un destino privado. Token e ID juntos habilitan el envío;
si falta cualquiera, se deshabilita con un mensaje al arrancar, sin repetirlo por
operación. Formatos inválidos se rechazan sin imprimir su valor.

Crea/configura el bot con BotFather, añádelo al grupo de soporte y permite que
publique mensajes. Obtén el ID del grupo mediante la administración/herramienta
confiable de Telegram y configura ambas variables solo en tu `.env` privado.
Reinicia la API. No pegues el token en comandos, capturas, documentación ni logs.
No es necesario activar lectura del grupo para este cliente de envío.

Mensajes exactos de ejemplo:

```text
Nuevo ticket TK-000020 · Impresoras · Media
Ticket TK-000020 asignado a Juan Pérez
Ticket TK-000020 reasignado de Juan Pérez a María López
Ticket TK-000020 marcado como Urgente
```

Solo se pasan al formateador número, categoría, prioridad y nombres de agentes,
según evento. No asunto, descripción, solicitante, correo, teléfono, username,
nota ni adjunto. Se normalizan saltos de línea y menciones en nombres/categoría.
El token nunca forma parte del contrato frontend. El envío no copia conversaciones.

## Fallos y límites

Primero termina el COMMIT; después se espera un único intento Telegram con timeout
de cuatro segundos. Nunca se llama antes del commit ni se mantiene el lock del
ticket durante la red. HTTP 403/429/5xx, respuesta API fallida, red y timeout se
capturan: el ticket/notificación web siguen confirmados y la API responde éxito.

El log de fallo contiene solo tipo de evento, número y status HTTP o unavailable.
No imprime URL, token, cuerpo de respuesta ni excepción original. No hay logs de
éxito por mensaje. Una petición puede tardar hasta cuatro segundos adicionales.

Sin outbox, cola ni reintentos: si el proceso termina después del commit o falla
el envío, ese aviso puede perderse. Tampoco se garantiza el orden entre avisos de
peticiones concurrentes. La web persiste aunque Telegram no entregue.

No hay email por evento, preferencias, WebSockets/SSE/push, seguimiento por bot,
lectura de mensajes, borrado ni retención automática. Las pruebas no usan red de
Telegram: inyectan un emisor/fetch falso, verifican commit/rollback y privacidad.
El setup de Vitest deshabilita el grupo real incluso si existe en el `.env` local.
