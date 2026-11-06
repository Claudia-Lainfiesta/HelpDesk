# Tickets

Cualquier cuenta autenticada y con contraseña definitiva puede crear un ticket
para sí misma. Un solicitante solo lista y abre los suyos; agente, supervisor y
administrador consultan todos. Un detalle ajeno al solicitante responde 404,
igual que uno inexistente. No hay asignación ni cambios de estado en esta etapa.

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

El seed incluye seis tickets persistidos, diferentes solicitantes/categorías y
los seis estados, con fechas de resolución, cierre y cancelación coherentes.
Repetirlo no duplica registros ni restablece contraseñas.

`npm run check` incluye pruebas con PostgreSQL en esquemas privados si se exporta
`DATABASE_URL`; de lo contrario las integraciones se omiten con mensaje. No
implementa asignación, transiciones, historial, prioridad, adjuntos ni Telegram.

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
`cerrado` y `cancelado`. Actualmente toda alta usa `creado`; los demás estados
pueden verse en seed, filtros e insignias. No existen endpoints para cambiarlos
ni para rellenar fechas de resolución, cierre o cancelación desde la aplicación.
