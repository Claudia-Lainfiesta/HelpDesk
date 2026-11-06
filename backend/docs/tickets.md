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
cuerpos HTTP. Se conservan cookie HttpOnly, CSRF, JSON y cambio obligatorio.

## Listar y abrir

```http
GET /api/tickets?page=1&pageSize=20&search=impresora&status=creado&categoryId=4
GET /api/tickets/123
```

El listado devuelve `{ data, page, pageSize, total }`; cada elemento tiene el
contrato anterior. `page` comienza en 1, por defecto 1; `pageSize` admite 10, 20 y
50, por defecto 20. `search` admite hasta 160 caracteres, busca número y asunto
sin distinguir mayúsculas, incluyendo `TK-000123`, `000123` o `123`. Es búsqueda de subcadenas,
no una coincidencia numérica exacta. `%` y `_` se
interpretan literalmente. SQL parametrizado, sin orden configurable.

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
implementa prioridad, comentarios, adjuntos, SLA ni Telegram de tickets.

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
`fromStatus` o `actorId`. Todas las escrituras conservan sesión, CSRF y JSON.

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

| Acción                                  | Propietario sin otro permiso | Agente asignado ajeno          | Otro agente            | Supervisor/administrador |
| --------------------------------------- | ---------------------------- | ------------------------------ | ---------------------- | ------------------------ |
| Ver detalle/actividad                   | Sí                           | Sí                             | Sí                     | Sí                       |
| Asignarse si está libre y activo        | Solo si tiene rol agente     | Solo si está libre             | Sí                     | No; asigna a un agente   |
| Asignar otro / reasignar / desasignar   | No                           | No                             | No                     | Sí, en estados activos   |
| Iniciar / esperar / reanudar / resolver | No                           | Sí, según transición           | No                     | Sí, con agente asignado  |
| Cancelar creado o en_espera             | Sí                           | Solo si también es propietario | Solo si es propietario | Sí                       |
| Cancelar en_proceso                     | No                           | No                             | No                     | No                       |
| Reabrir o cerrar resuelto               | Sí                           | Solo si también es propietario | Solo si es propietario | Sí                       |

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

Tipos: created, assigned, reassigned, unassigned y status_changed. Las asignaciones
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
ticket.status_changed. Solo IDs, número/categoría o códigos estructurados; sin
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
