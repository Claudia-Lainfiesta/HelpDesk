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
  "number": "HD-000123",
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
sin distinguir mayúsculas, incluyendo `HD-000123` o `000123`. `%` y `_` se
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

`0011_ticket_core.sql` evoluciona la tabla existente. Conserva `id` bigint
identity, FKs `category_id`, `requester_id`, `assigned_agent_id` nullable y
`status_id` hacia el catálogo fijo de seis estados. No duplica el estado en una
columna textual. `reference` se genera como HD- desde el identity, es única y
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
