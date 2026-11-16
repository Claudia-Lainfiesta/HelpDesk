# Tickets

Cualquier cuenta autenticada y con contraseña definitiva puede crear un ticket
para sí misma. Un solicitante solo lista y abre los suyos; agente, supervisor y
administrador consultan todos. Un detalle ajeno al solicitante responde 404,
igual que uno inexistente. La asignación y las transiciones se realizan mediante las acciones documentadas abajo.

## Crear

```http
POST /api/tickets
Origin: http://localhost:4200
Content-Type: application/json
```

```json
{
  "subject": "No puedo imprimir",
  "description": "La impresora muestra un error.",
  "categoryId": "4"
}
```

La respuesta es 201 con `Location: /api/tickets/:id` y el ticket completo:

```json
{
  "id": "123",
  "number": "TK-000123",
  "subject": "No puedo imprimir",
  "description": "La impresora muestra un error.",
  "status": "creado",
  "priority": "media",
  "attachment": null,
  "category": { "id": "4", "name": "Hardware" },
  "requester": { "id": "18", "fullName": "Ana Pérez", "email": "ana@example.invalid" },
  "assignedAgent": null,
  "createdAt": "2026-11-06T19:15:00.000Z",
  "updatedAt": "2026-11-06T19:15:00.000Z",
  "resolvedAt": null,
  "closedAt": null,
  "canceledAt": null
}
```

Asunto y descripción se recortan y admiten 1–160 y 1–5000 caracteres,
respectivamente. Categoría obligatoria y activa: inexistente responde 400
`INVALID_CATEGORY`; inactiva, 409 `CATEGORY_INACTIVE`. Campos adicionales
responden 400 `INVALID_INPUT`: el cliente no puede decidir solicitante, estado,
agente, número ni fechas. Siempre nace `creado`, sin agente, con el solicitante
obtenido de la sesión. Una categoría se bloquea en modo compartido durante el
alta para impedir su desactivación simultánea.

El ticket y `ticket.created` se guardan en la misma transacción. La auditoría
solo incluye número y categoría, sin asunto ni descripción. No se registran
cuerpos HTTP. Se conservan cookie HttpOnly, CSRF y cambio obligatorio; la creación admite JSON o multipart.

## Listar y abrir

```http
GET /api/tickets?page=1&pageSize=20&search=impresora&status=creado&priority=alta&categoryId=4
GET /api/tickets/123
```

El listado devuelve `{ data, page, pageSize, total }`; cada elemento tiene el
contrato anterior. `page` comienza en 1, por defecto 1; `pageSize` admite 10, 20 y
50, por defecto 20. `search` admite hasta 160 caracteres, busca número y asunto
sin distinguir mayúsculas, incluyendo `TK-000123`, `000123` o `123`. Es búsqueda de subcadenas,
no una coincidencia numérica exacta. `%` y `_` se
interpretan literalmente. SQL parametrizado, sin orden configurable.

`priority` admite una de `baja`, `media`, `alta`, `urgente`; es opcional y se combina
con los demás filtros. No participa en `search`.

`status` admite `creado`, `en_proceso`, `en_espera`, `resuelto`, `cerrado` y
`cancelado`. `categoryId` es un ID bigint positivo; también admite categorías
inactivas para consultas históricas. Parámetros inválidos o desconocidos
responden 400 `INVALID_INPUT`. El orden es creación descendente, luego ID
descendente; el total y los datos comparten una instantánea consistente.

La categoría inactiva sigue mostrándose en tickets anteriores. La API de
categorías permite descubrir todas las categorías al administrador; otros roles
solo descubren activas. El filtro de tickets acepta IDs históricos para todos
los roles, respetando siempre la visibilidad de sus tickets.

## Persistencia y esquema

`0011_ticket_core.sql` evoluciona la tabla existente y
`0012_ticket_reference_tk.sql` establece el prefijo público actual. Conserva `id` bigint
identity, FKs `category_id`, `requester_id`, `assigned_agent_id` nullable y
`status_id` hacia el catálogo fijo de seis estados. No duplica el estado en una
columna textual. El número interno es `id`; no hay una columna separada
`ticket_number`. `reference` se genera como TK- desde el identity, es única y
no trunca valores mayores a seis dígitos. No se usa `MAX()+1`; puede haber saltos
por transacciones revertidas. Las fechas son timestamptz. Añade `canceled_at`,
límites de longitud e índices de listado global y por solicitante. Conserva el
trigger de `updated_at` y las FKs sin borrado en cascada.

```bash
npm run db:up
npm run db:migrate
npm run db:seed:dev
npm run dev
```

El seed incluye siete tickets persistidos, diferentes solicitantes/categorías y
los seis estados, con fechas de resolución, cierre y cancelación coherentes.
Repetirlo no duplica registros ni restablece contraseñas.

`npm run check` incluye pruebas con PostgreSQL en esquemas privados si se exporta
`DATABASE_URL`; de lo contrario las integraciones se omiten con mensaje. No
implementa comentarios públicos ni SLA. La única imagen adjunta se admite al crear, como se describe abajo. Las notas internas y el contacto directo por Telegram se describen abajo.

## Referencia canónica y auditoría

`TK-XXXXXX` es el identificador público: `TK-000001`, `TK-000042` y `TK-001253`.
Tiene un mínimo de seis dígitos: `TK-999999` y luego `TK-1000000`, sin truncar.
El ID bigint es interno y permanece en rutas `/api/tickets/:id` y `/tickets/:id`.
La UI y los avisos muestran siempre `number` recibido; no duplican el formateo.
La única fuente del formato es la expresión SQL de `tickets.reference`.

La migración 0012 usa ALTER COLUMN SET EXPRESSION de PostgreSQL 17 para
recalcular los valores almacenados existentes, conservando IDs, datos,
relaciones, índice único y secuencia. No borra tickets ni reinicia números.
Los eventos históricos conservan el número que registraron; los nuevos
`ticket.created` guardan el `ticketNumber` actual. La validación de auditoría
acepta el formato canónico. No se promete compatibilidad con el prefijo anterior.
[Referencia técnica de PostgreSQL 17](https://www.postgresql.org/docs/17/sql-altertable.html).

Los estados del catálogo son `creado`, `en_proceso`, `en_espera`, `resuelto`,
`cerrado` y `cancelado`. Toda alta usa `creado`, sin agente. Las acciones siguientes controlan las transiciones y fechas.

## Asignación y concurrencia

`GET /api/tickets/assignable-agents` solo permite supervisor y administrador.
Devuelve un arreglo `{ id, fullName, email }`, ordenado por nombre e ID, con
agentes activos y no vencidos. Un bloqueo de login no excluye un agente.
No concede acceso a `/api/users`. Cuentas inactivas, vencidas o que cambiaron de
rol conservan sus asignaciones históricas; no se ofrecen para nuevas asignaciones.

```http
PATCH /api/tickets/123/assignment
Content-Type: application/json
Origin: http://localhost:4200
```

```json
{ "agentId": "42" }
```

`agentId: null` desasigna. Devuelve el ticket completo con 200. Solo puede
modificarse en creado, en_proceso o en_espera. El agente únicamente se asigna a
sí mismo si está libre. Supervisor y administrador asignan/reasignan/desasignan;
no pueden ser destino porque únicamente el rol real agente es asignable.
Asignar no cambia el estado. Repetir la asignación devuelve 409 sin evento nuevo.

Cada mutación abre una transacción, estabiliza la cuenta del actor con FOR SHARE,
bloquea la fila base del ticket con FOR UPDATE y después lee su estado vigente.
Vuelve a comprobar rol, propiedad y asignación; bloquea también el agente destino
frente a baja/cambio de rol. Actualiza, inserta actividad y auditoría y confirma.
Un fallo revierte los tres registros. Dos agentes sobre el mismo ticket libre
producen un éxito y un conflicto. No se confía en actor/rol/estado anterior del cliente.

## Acciones de estado

```http
POST /api/tickets/123/transitions
```

```json
{ "action": "start" }
```

Devuelve 200 con el ticket completo. No admite `status`, `targetStatus`,
`fromStatus` o `actorId`. Todas las escrituras conservan sesión y CSRF. Solo creación admite además multipart; las operaciones de asignación, estado, prioridad y notas siguen usando JSON.

| Acción  | Origen     | Destino    | Permiso                                     | Requiere agente                         |
| ------- | ---------- | ---------- | ------------------------------------------- | --------------------------------------- |
| start   | creado     | en_proceso | Agente asignado, supervisor o administrador | Sí                                      |
| wait    | en_proceso | en_espera  | Agente asignado, supervisor o administrador | Sí                                      |
| resume  | en_espera  | en_proceso | Agente asignado, supervisor o administrador | Sí                                      |
| resolve | en_proceso | resuelto   | Agente asignado, supervisor o administrador | Sí                                      |
| resolve | en_espera  | resuelto   | Agente asignado, supervisor o administrador | Sí                                      |
| reopen  | resuelto   | en_proceso | Propietario, supervisor o administrador     | No añade condición; conserva asignación |
| close   | resuelto   | cerrado    | Propietario, supervisor o administrador     | No                                      |
| cancel  | creado     | cancelado  | Propietario, supervisor o administrador     | No                                      |
| cancel  | en_espera  | cancelado  | Propietario, supervisor o administrador     | No                                      |

Cerrado y cancelado son terminales: sin transiciones ni cambios de asignación.
Resuelto solo permite cerrar o reabrir; no permite modificar asignación.
No se cancela desde en_proceso. No se reabren tickets cerrados.

La propiedad es independiente del rol único. Un agente propietario puede cerrar,
reabrir o cancelar su ticket en los estados permitidos, aunque otro agente lo
atienda. No obtiene por eso permiso para iniciar/esperar/resolver; necesita ser
el agente asignado o tener rol supervisor/administrador.

| Acción                                            | Propietario sin otro permiso     | Agente asignado ajeno          | Otro agente            | Supervisor/administrador |
| ------------------------------------------------- | -------------------------------- | ------------------------------ | ---------------------- | ------------------------ |
| Ver detalle/actividad                             | Sí                               | Sí                             | Sí                     | Sí                       |
| Asignarse si está libre y activo                  | Solo si tiene rol agente         | Solo si está libre             | Sí                     | No; asigna a un agente   |
| Asignar otro / reasignar / desasignar             | No                               | No                             | No                     | Sí, en estados activos   |
| Iniciar / esperar / reanudar / resolver           | No                               | Sí, según transición           | No                     | Sí, con agente asignado  |
| Cancelar creado o en_espera                       | Sí                               | Solo si también es propietario | Solo si es propietario | Sí                       |
| Cancelar en_proceso                               | No                               | No                             | No                     | No                       |
| Reabrir o cerrar resuelto                         | Sí                               | Solo si también es propietario | Solo si es propietario | Sí                       |
| Ver notas internas (incluidos terminales)         | No por ser propietario           | Sí                             | No                     | Sí                       |
| Agregar nota interna (no terminal)                | No por ser propietario           | Sí                             | No                     | Sí                       |
| Hablar por Telegram con el agente (no terminal)   | Sí, salvo contacto consigo mismo | Solo si es propietario         | Solo si es propietario | Solo si es propietario   |
| Cambiar prioridad (no terminal, incluye Resuelto) | No por ser propietario           | Sí                             | No                     | Sí                       |

`createdAt` nunca cambia. El trigger actualiza `updatedAt` al mutar. Resolver fija
`resolvedAt`; reabrir la limpia y conserva agente e historial. Cerrar conserva
resolución y fija `closedAt`. Cancelar fija solo `canceledAt`, sin simular éxito.
No se solicitan comentarios ni motivos de texto en estas acciones.

## Actividad y auditoría

`GET /api/tickets/123/events?page=1&pageSize=50` tiene los permisos del detalle:
propietario y los tres roles de soporte; solicitante ajeno recibe 404. Devuelve
`{ data, page, pageSize, total }`, con páginas desde 1 y tamaños de 1 a 100.
Orden: fecha descendente e ID descendente. Total y datos usan una misma instantánea.

```json
{
  "data": [
    {
      "id": "20",
      "type": "status_changed",
      "actor": { "id": "7", "fullName": "Juan Ejemplo", "role": "agente" },
      "fromStatus": "creado",
      "toStatus": "en_proceso",
      "fromAgent": null,
      "toAgent": null,
      "createdAt": "2026-11-06T21:00:00.000Z"
    }
  ],
  "page": 1,
  "pageSize": 50,
  "total": 1
}
```

Tipos: created, assigned, reassigned, unassigned, status_changed, priority_changed y note_added. Las asignaciones
incluyen `fromAgent`/`toAgent` con ID y nombre o null; estados null. Los cambios de
estado contienen códigos anterior/nuevo; agentes null. Created no inventa cambios.
El rol y nombre del actor son los actuales, no una copia histórica; IDs y códigos
anteriores/nuevos permanecen. No devuelve correo, notas ni credenciales del actor.

La migración 0013 crea ticket_events, sus FK RESTRICT e índice por ticket/fecha.
Recupera exclusivamente created con solicitante y fecha originales para tickets
anteriores. No infiere transiciones pasadas. El seed nuevo incluye siete casos,
uno creado asignado y los seis estados, con cronologías ficticias válidas. Repetir
seed no inventa eventos para ejemplos existentes ni modifica su historial.

La actividad es funcional y visible según permisos. La auditoría global registra
además ticket.created, ticket.assigned, ticket.reassigned, ticket.unassigned y
ticket.status_changed y ticket.priority_changed. Solo IDs, número/categoría o códigos estructurados; sin
asuntos, descripciones, mensajes, contraseñas ni tokens. No hay API de edición o
borrado de actividad ni auditoría.

## Errores de operaciones

| HTTP | Código                      | Significado                                               |
| ---- | --------------------------- | --------------------------------------------------------- |
| 404  | TICKET_NOT_FOUND            | Inexistente o solicitante sobre ticket ajeno              |
| 403  | TICKET_ACTION_FORBIDDEN     | Puede verlo, pero no realizar la acción                   |
| 409  | TICKET_ASSIGNMENT_UNCHANGED | Asignación repetida, sin evento                           |
| 409  | TICKET_ALREADY_ASSIGNED     | Otro agente ganó la asignación                            |
| 409  | AGENT_NOT_ASSIGNABLE        | Destino inexistente, inactivo, vencido o de otro rol      |
| 409  | TICKET_AGENT_REQUIRED       | Debe asignarse antes de iniciar/esperar/reanudar/resolver |
| 409  | INVALID_TICKET_TRANSITION   | Estado incompatible o terminal                            |
| 400  | INVALID_INPUT               | Campos extra, ID, acción o paginación inválidos           |

La implementación valida el estado vigente y permite una acción si sigue siendo
válida. No usa versión del cliente ni detecta todos los casos de volver al mismo
estado entre dos lecturas. Ante conflicto, el frontend anuncia y recarga detalle
más actividad. No hay WebSockets ni control optimista por versión.

## Prioridad operativa

`TicketPriority` solo admite `baja`, `media`, `alta` y `urgente`. Todos los tickets
nuevos nacen `media` mediante default NOT NULL en PostgreSQL; las cuatro prioridades
son visibles en creación, listado, detalle y respuestas de mutación. El body de
creación sigue limitado a subject/description/categoryId: incluir priority devuelve
400 INVALID_INPUT. El solicitante no elige ni cambia prioridad.

```http
PATCH /api/tickets/123/priority
Origin: http://localhost:4200
Content-Type: application/json
```

```json
{ "priority": "alta" }
```

Devuelve 200 con el ticket completo. Solo puede modificar el agente actualmente
asignado, supervisor o administrador. Ser propietario, aunque tenga rol agente,
no concede este permiso. Solicitante sobre ticket ajeno recibe 404; quien puede
verlo pero carece del permiso recibe 403 TICKET_ACTION_FORBIDDEN.

Se permite en Creado, En proceso, En espera y Resuelto. Cerrado/Cancelado conservan
su último valor y responden 409 TICKET_PRIORITY_NOT_EDITABLE. Repetir el valor
responde 409 TICKET_PRIORITY_UNCHANGED, sin UPDATE, actividad o auditoría redundantes.
Valores desconocidos, null y campos adicionales responden 400 INVALID_INPUT.

La operación reutiliza FOR SHARE del actor y FOR UPDATE de la fila del ticket.
Comprueba permisos, estado y prioridad vigentes después de adquirir el bloqueo;
actualización, actividad y auditoría comparten transacción. Un fallo revierte todo.
Dos solicitudes iguales concurrentes dan un cambio y un conflicto; dos valores
diferentes dejan una secuencia anterior/nueva coherente.

Solo cambia priority y updated_at. Estado, asignación, created_at, resolved_at,
closed_at y canceled_at se conservan. Tampoco cambian prioridad las asignaciones,
transiciones, categoría, antigüedad o reaperturas: no hay reglas automáticas, SLA,
escalamiento ni cálculo de prioridad. Urgente sí genera los avisos documentados en la guía de notificaciones.

La migración 0014 añade priority TEXT CHECK con default media y normaliza todos
los tickets existentes a ese valor, sin inferir historia ni generar actividad.
Amplía ticket_events con priority_changed y from_priority/to_priority, restringidas
a las cuatro opciones, no nulas y diferentes solo en este tipo; en los demás son
null. Conserva las restricciones de forma de los tipos anteriores. La auditoría
usa ticket.priority_changed con solo fromPriority/toPriority.

```json
{
  "id": "45",
  "type": "priority_changed",
  "actor": { "id": "7", "fullName": "Juan Ejemplo", "role": "agente" },
  "fromPriority": "media",
  "toPriority": "alta",
  "fromStatus": null,
  "toStatus": null,
  "fromAgent": null,
  "toAgent": null,
  "createdAt": "2026-11-15T16:00:00.000Z"
}
```

`GET /api/tickets?priority=alta` admite un valor; arrays o valores inválidos dan
400 INVALID_INPUT. Mantiene el orden created_at DESC, id DESC, sin poner urgentes
primero. El seed nuevo distribuye las cuatro prioridades como valores iniciales
ficticios; no inserta priority_changed si no ocurrió un cambio. Repetir seed conserva
los ejemplos y prioridades existentes, incluyendo los normalizados por migración.

## Notas internas

HelpDesk administra el ticket. La conversación directa ocurre en Telegram y no se
replica en el sistema. Soporte resume la información relevante mediante notas internas;
no son comentarios públicos ni se envían al solicitante.

```http
POST /api/tickets/123/notes
Origin: http://localhost:4200
Content-Type: application/json
```

```json
{ "body": "Se consultó al solicitante. Se espera una nueva prueba de conexión." }
```

201 devuelve `{ id, body, author: { id, fullName }, createdAt }`. Solo acepta `body`,
texto plano de 1 a 5000 caracteres después de trim. Campos adicionales, tipos o
longitudes inválidas responden 400 INVALID_INPUT. No interpreta HTML, Markdown o
scripts; conserva saltos de línea. No existen endpoints para editar, borrar u ocultar notas.
Un error se corrige publicando otra nota.

El agente **actualmente asignado**, supervisor y administrador pueden leerlas.
También pueden crearlas en Creado, En proceso, En espera y Resuelto. En
Cerrado/Cancelado solo pueden leer las existentes; crear devuelve 409
TICKET_NOTES_READ_ONLY. Solicitante propietario y agente no asignado reciben 403
TICKET_NOTE_FORBIDDEN al intentar crear; solicitante ajeno recibe 404 TICKET_NOT_FOUND.
Ser propietario con rol agente tampoco concede permisos internos.

`0015_ticket_notes.sql` crea ticket_notes con identity bigint, ticket_id y
author_user_id obligatorios, FK RESTRICT, body y created_at timestamptz. Índice
(ticket_id, created_at). Amplía ticket_events con note_added y note_id FK nullable
para otros eventos; CHECK de forma conserva los tipos anteriores. El cuerpo solo
se guarda en ticket_notes, nunca en ticket_events ni audit_events.

Actor vigente y ticket se bloquean siguiendo el patrón de las otras operaciones.
Insertar nota, evento y auditoría `ticket.note_added` con solo `{ noteId }` comparten
transacción. Cualquier fallo revierte los tres. Agregar una nota no hace UPDATE del
ticket: tampoco cambia updated_at, estado, prioridad, asignación ni fechas de resolución,
cierre o cancelación. No envía correo ni Telegram.

Se usa la cronología existente; **no hay GET /notes duplicado**. Ejemplo de evento:

```json
{
  "id": "46",
  "type": "note_added",
  "actor": { "id": "7", "fullName": "Juan Ejemplo", "role": "agente" },
  "note": { "id": "9", "body": "Se espera una nueva prueba de conexión." },
  "fromPriority": null,
  "toPriority": null,
  "fromStatus": null,
  "toStatus": null,
  "fromAgent": null,
  "toAgent": null,
  "createdAt": "2026-11-15T20:00:00.000Z"
}
```

GET /events excluye note_added **en SQL antes de contar y paginar** cuando quien
consulta no es soporte autorizado. No devuelve cuerpos, IDs, eventos ocultos ni
contadores de notas. Usa la asignación de la misma instantánea que la consulta.
Tras reasignar A a B, B obtiene todas las notas históricas; A deja de recibirlas en
su siguiente consulta. Se conserva el orden fecha DESC, id DESC.

El seed añade tres notas ficticias y sus eventos a los nuevos ejemplos En proceso,
En espera y Resuelto, con autor asignado y fechas coherentes. Repetirlo no duplica
ni reconstruye notas de ejemplos que ya existían.

## Contacto directo por Telegram

La decisión actual sustituye el relevo del bot para el flujo de tickets. Solo el
**propietario** puede abrir una conversación con el **agente asignado**, siempre
que el ticket no sea terminal y no se trate de contactar consigo mismo. Tener rol
supervisor/administrador no concede esta capacidad en tickets ajenos. Los permisos
de notas son independientes.

El administrador configura `telegramUsername` en POST/PATCH /api/users: acepta
@usuario o usuario convencional (5–32 caracteres, comienza por letra; letras,
números y guion bajo), normaliza sin @ y en minúsculas. null permite quitarlo.
`0016_agent_telegram_username.sql` añade users.telegram_username nullable con CHECK.
Es un dato declarado por el administrador, que debe comprobarlo con el empleado;
no se deriva del correo o nombre ni se verifica mediante el bot. No almacena ID
numérico de Telegram. El historial de cambios administrativos solo registra el
nombre del campo, sin copiar el contacto a auditoría.

```http
GET /api/tickets/123/telegram-contact
```

Con sesión y permisos devuelve 200 `{ "available": true, "url": "https://t.me/agente_ejemplo?text=Hola%2C+te+contacto+por+el+ticket+TK-000123%3A+%22No+puedo+imprimir%22." }`.
La URL se construye únicamente desde el usuario público guardado; el cliente no
elige destino. Si falta agente: 200 `{ "available": false, "message": "Este ticket todavía no tiene un agente asignado." }`.
Si falta usuario público, el agente está inactivo, vencido o ya no tiene rol agente:
200 `{ "available": false, "message": "Este agente no tiene Telegram configurado." }`.
No devuelve chat IDs, token ni información adicional. Ticket terminal: 409
TICKET_CONTACT_UNAVAILABLE; actor que no es propietario o se contactaría consigo
mismo: 403 TICKET_ACTION_FORBIDDEN; solicitante ajeno: 404 como en el detalle.

El backend añade exclusivamente `text` con `URL.searchParams`, usando referencia y
asunto del ticket bloqueado: `Hola, te contacto por el ticket TK-000123: "No puedo imprimir".`
No trunca los 160 caracteres de asunto; codifica comillas, &, ?, # y acentos.
No acepta texto o username del cliente como autoridad. No incluye descripción,
prioridad, categoría, datos personales ni notas. El texto queda como borrador:
**el usuario decide si pulsa Enviar**, sin envío automático.
[Formato oficial de Telegram](https://core.telegram.org/api/links#public-username-links).

No llama a Telegram, no inicia el bot, no registra actividad ni crea notas. Abrir
el enlace no garantiza que el agente responda o que Telegram esté disponible.
Se requiere que el empleado mantenga vigente su usuario público. Los enlaces por
ID numérico no son un mecanismo general de contacto desde web:
[enlaces oficiales de Telegram](https://core.telegram.org/api/links).

No hay relevo privado, vinculación por bot, chat interno ni copia automática de conversaciones.
Los avisos de grupo son independientes del contacto directo.

## Imagen inicial del ticket

Durante POST /api/tickets se admite **0 o 1 imagen**, opcional y exclusivamente al
crear: JPEG (.jpg/.jpeg), PNG o WebP, máximo exacto **10 MiB = 10 × 1024 × 1024 =
10485760 bytes**. No acepta GIF, SVG, PDF ni otros formatos. Después no existen
endpoints ni controles para agregar, cambiar o quitar imágenes; las adicionales
se comparten por Telegram cuando haya agente asignado.

La creación conserva JSON para clientes sin imagen y admite multipart/form-data
con campos subject, description, categoryId e image opcional. Ejemplo con un
archivo de cookies privado ya obtenido al iniciar sesión:

```bash
curl --cookie /tmp/helpdesk-cookies.txt \
  -H 'Origin: http://localhost:4200' \
  -F 'subject=No puedo imprimir' \
  -F 'description=La impresora muestra un error.' \
  -F 'categoryId=4' \
  -F 'image=@captura.png;type=image/png' \
  http://localhost:3000/api/tickets
```

No fijes Content-Type: el cliente genera boundary. La excepción multipart de CSRF
se limita a POST /api/tickets: el origen sigue siendo obligatorio, así como sesión
y contraseña definitiva. No se permite multipart en login, usuarios, categorías,
estados, prioridad o notas. Campos de autoridad y validaciones de texto se siguen
rechazando. Cualquier rol puede crear para sí mismo, incluida su imagen inicial.

Multer 2.5 usa memoryStorage, un archivo image, tres campos de texto y buffers por
petición sin disco ni buffers globales. La lectura permite un byte sobre el límite
para distinguirlo del tamaño exacto; la validación rechaza cualquier imagen mayor
a 10485760 bytes. Se comprueban los bytes: firma JPEG/terminador, firma PNG con
cabecera IHDR y estructura RIFF/WEBP con tamaño y chunk válidos. Además deben
coincidir MIME declarado y extensión. Es detección de formato, sin decodificar,
transformar, escanear con antivirus o modificar píxeles.

0017_ticket_attachments.sql crea ticket_attachments: id identity bigint, ticket_id
NOT NULL UNIQUE y FK RESTRICT, original_filename (1–255), mime_type (solo los tres),
size_bytes (1–10485760), data BYTEA con octet_length igual a size_bytes y created_at
timestamptz. La unicidad proporciona el índice por ticket; no hay índices adicionales.
No guarda rutas ni crea carpetas uploads. Los tickets existentes quedan sin imagen.
El seed normal no añade binarios. Los fixtures propios de pruebas son diminutos.

Categoría, ticket, imagen, evento created y auditoría ticket.created comparten una
transacción. Un fallo revierte todo. No se añade evento de imagen ni metadata
binaria a auditoría; se conserva su contrato anterior. La imagen no afecta número,
prioridad Media, estado Creado ni asignación inicial nula.

Creación, listado, detalle y mutaciones devuelven la misma metadata, nunca bytes:

```json
{
  "attachment": {
    "id": "15",
    "fileName": "captura.png",
    "mimeType": "image/png",
    "sizeBytes": 483291
  }
}
```

Sin archivo, attachment es null. Las consultas de metadata nunca seleccionan data.

GET /api/tickets/:id/attachment devuelve el Buffer original. Exige exactamente la
visibilidad del detalle: propietario y roles de soporte; solicitante ajeno recibe
404 TICKET_NOT_FOUND aunque exista imagen. Sin sesión: 401; ticket inexistente:
404 TICKET_NOT_FOUND; ticket visible sin imagen: 404 TICKET_ATTACHMENT_NOT_FOUND.
En terminales la imagen original sigue disponible para quienes pueden ver el ticket.

Cabeceras: Content-Type validado, Content-Length exacto, X-Content-Type-Options:
nosniff, Cache-Control: no-store y Content-Disposition: inline con filename ASCII
saneado y filename* UTF-8. El nombre solo es metadata: se neutralizan controles,
comillas y separadores; nunca se usa como ruta ni se ejecuta.

Errores de alta: 413 IMAGE_TOO_LARGE, 400 INVALID_IMAGE (vacío, formato o coherencia
inválidos), 400 INVALID_MULTIPART (más archivos/campos, archivo de nombre inesperado
u otro multipart inválido). Se mantienen los errores de texto/categoría y CSRF.
No hay POST/PUT/PATCH/DELETE /api/tickets/:id/attachment.

Consulta también la [guía de notificaciones](notifications.md) para destinatarios por evento y avisos generales al grupo.
