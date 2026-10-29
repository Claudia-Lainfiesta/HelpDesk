# Usuarios, cuentas temporales y categorías

Estas rutas usan las [sesiones y protecciones de autenticación](auth.md).
Solo el administrador gestiona usuarios y categorías. Los cuatro roles pueden
consultar categorías activas después de cambiar su contraseña temporal.
Los IDs bigint se envían como cadenas y las fechas como ISO 8601 con zona horaria.

Todos los POST y PATCH requieren cookie, origen permitido y
`Content-Type: application/json`. Los comandos sin parámetros reciben `{}`.
Los errores usan `{ "error": { "code": "...", "message": "..." } }`:
401 sin sesión válida y 403 sin permiso.

## Usuarios

Todas estas rutas requieren `requireRole('administrador')`:

| Método y ruta                        | Operación                                     |
| ------------------------------------ | --------------------------------------------- |
| `GET /api/users`                     | Lista paginada y filtrada                     |
| `GET /api/users/:id`                 | Consulta una cuenta                           |
| `POST /api/users`                    | Crea una cuenta; responde 201                 |
| `PATCH /api/users/:id`               | Cambia nombre, rol, vencimiento o notas       |
| `POST /api/users/:id/deactivate`     | Desactiva y revoca todas las sesiones         |
| `POST /api/users/:id/reactivate`     | Reactiva sin renovar vencimientos ni sesiones |
| `POST /api/users/:id/reset-password` | Genera otra contraseña temporal local         |
| `POST /api/users/:id/unlock`         | Limpia intentos fallidos y bloqueo            |

### Listar y consultar

```http
GET /api/users?page=1&pageSize=20&role=agente&active=true&provider=local&temporary=false&expired=false&q=Ana
```

`page` empieza en 1 (máximo 1000000). `pageSize` vale 20 por defecto y admite
de 1 a 100. Los filtros son opcionales: `role` usa uno de los cuatro códigos;
`provider`, `local` o `directory`; los booleanos son exactamente `true` o
`false`. `temporary` filtra cuentas con/sin `expires_at`; `expired=true`
selecciona las vencidas y `false` incluye las que no vencen. `q` busca por nombre
o correo sin distinguir mayúsculas (hasta 100 caracteres). `%` y `_` son texto
literal, no comodines.

```json
{
  "data": [
    {
      "id": "12",
      "fullName": "Ana Ejemplo",
      "email": "ana@helpdesk.local",
      "roleCode": "agente",
      "authProvider": "local",
      "isActive": true,
      "mustChangePassword": true,
      "expiresAt": null,
      "temporary": false,
      "expirationRequired": false,
      "createdBy": "4",
      "notes": null,
      "createdAt": "2026-10-29T15:00:00.000Z",
      "updatedAt": "2026-10-29T15:00:00.000Z",
      "failedLoginAttempts": 0,
      "lockedUntil": null,
      "lastLoginAt": null,
      "passwordChangedAt": null
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 1
}
```

El detalle devuelve el mismo objeto de cuenta, sin paginación. Ni el listado
ni el detalle devuelven hashes o contraseñas. Las respuestas de usuarios llevan
`Cache-Control: no-store`.

### Crear una cuenta

```http
POST /api/users
```

```json
{
  "fullName": "Empleado de ejemplo",
  "email": "empleado@helpdesk.local",
  "roleCode": "solicitante",
  "authProvider": "local",
  "notes": "Incorporación al equipo"
}
```

`fullName` admite de 1 a 200 caracteres, el correo hasta 254 y `notes` hasta
2000 o `null`. Los textos se recortan en los extremos. El correo es único sin
distinguir mayúsculas. `roleCode` es obligatorio: `solicitante`, `agente`,
`supervisor` o `administrador`; el rol debe existir en el catálogo.

El proveedor predeterminado es `local`. La respuesta 201 devuelve la cuenta y,
solo para local, añade este campo:

```json
{ "temporaryPassword": "<mostrada una sola vez en la respuesta real>" }
```

Ese marcador no es una contraseña utilizable. La real tiene 16 caracteres
aleatorios, seleccionados con `crypto.randomInt` sin caracteres ambiguos.
Solo se guarda el hash Argon2id y se exige cambio al ingresar. `createdBy`
identifica al administrador que hizo el alta.

Con `"authProvider": "directory"`, la cuenta no recibe hash ni
`temporaryPassword`. Por ahora no puede iniciar sesión: recibe el mismo 401
genérico que otras credenciales inválidas. El acceso corporativo llegará
después. PATCH no permite cambiar el correo ni el proveedor.

### Cuentas temporales

```json
{
  "fullName": "Auditoría de prueba como supervisor",
  "email": "auditoria.supervisor@helpdesk.local",
  "roleCode": "supervisor",
  "temporary": true,
  "notes": "Auditoría externa, octubre"
}
```

`temporary: true` crea una cuenta local con vencimiento obligatorio. Sin fecha,
usa 7 días desde la creación (`TEMP_ACCOUNT_DEFAULT_DAYS`). También admite
`expiresAt` explícito. El máximo predeterminado es de 30 días
(`TEMP_ACCOUNT_MAX_DAYS`), contado desde la creación original, incluso al
ampliar el plazo. Se rechazan fechas pasadas o iguales al momento actual.
Los plazos son días de 24 horas. Ambas variables admiten enteros de 1 a 365;
el valor por defecto no puede superar el máximo.

La marca `users.is_temporary` conserva que la cuenta nació con
`temporary: true`. Esas cuentas devuelven `expirationRequired: true` y no pueden
quedar con `expiresAt: null`. Una cuenta normal puede recibir un vencimiento
opcional y volver después a `null`, respetando el máximo al fijar una fecha.
Toda cuenta con fecha se considera temporal en el filtro y devuelve
`temporary: true`; `expirationRequired` distingue las que deben conservarla.
Las cuentas con vencimiento deben ser locales.

No hay un quinto rol: crea una cuenta de auditoría por cada rol necesario.
Pueden coexistir varias auditorías o empleados con el mismo rol; no se impone
unicidad global de cuentas por rol.

Al llegar `expiresAt`, el login se rechaza y las sesiones abiertas dejan de ser
válidas en la siguiente petición, sin un proceso programado. La cuenta y sus
relaciones permanecen. Reactivar no renueva la fecha. Cuando se agota el máximo
contado desde su creación, hay que crear otra cuenta temporal.

### Editar y operar

```http
PATCH /api/users/12
```

```json
{
  "fullName": "Nombre actualizado",
  "roleCode": "agente",
  "expiresAt": "2026-11-05T15:00:00.000Z",
  "notes": "Ampliación de una prueba de auditoría"
}
```

Envía solo los campos que cambian. `notes: null` borra las notas;
`expiresAt: null` quita un vencimiento opcional. El cambio de rol se aplica en
la siguiente petición porque las sesiones vuelven a leer el usuario y su rol.
PATCH y los comandos responden 200 con la cuenta actualizada.

Reset-password genera otra contraseña temporal, reinicia contador y bloqueo,
exige cambio y revoca todas las sesiones. Esa respuesta añade
`temporaryPassword` una sola vez. Para directorio responde 409
`DIRECTORY_ACCOUNT`, porque la contraseña se gestiona en el directorio.
Unlock conserva contraseña y sesiones; solo limpia fallos y bloqueo.

El administrador entrega la contraseña por otro medio. No se envía por correo,
no hay una ruta para volver a consultarla y no se registra en logs ni auditoría.
Si se pierde, se genera otra mediante reset-password. No actives trazas de
cuerpos HTTP ni copies la respuesta de alta/reset en tickets o reportes.

### Integridad

- No hay DELETE de usuarios. Desactivar conserva relaciones y revoca sesiones;
  reactivar permite entrar si se cumplen las demás condiciones de acceso.
- El administrador no puede desactivarse, cambiar su propio rol ni restablecer
  su propia contraseña. Para esto último existe change-password.
- Al retirar o dar vencimiento a un administrador se exige otro administrador
  activo, local, con contraseña y sin vencimiento. Un sustituto que también
  vencerá no garantiza que quede alguien; directory todavía no permite entrar.
- Un advisory lock transaccional serializa cambios entre procesos. Dos
  peticiones simultáneas no pueden retirar al último sustituto.

Errores específicos: 409 `EMAIL_EXISTS`, `SELF_DEACTIVATION`,
`SELF_ROLE_CHANGE`, `SELF_PASSWORD_RESET`, `LAST_ADMINISTRATOR` o
`DIRECTORY_ACCOUNT`; 400 `INVALID_INPUT`, `INVALID_ROLE`,
`INVALID_EXPIRATION`, `TEMP_LOCAL_REQUIRED` o `TEMP_EXPIRY_REQUIRED`;
404 `USER_NOT_FOUND`. Un PATCH vacío o con campos inmutables es inválido.

## Categorías

| Método y ruta                              | Permiso y respuesta                                                |
| ------------------------------------------ | ------------------------------------------------------------------ |
| `GET /api/categories`                      | Cualquier usuario autenticado; 200 `{ "data": [...] }` con activas |
| `GET /api/categories?includeInactive=true` | Solo administrador; incluye inactivas                              |
| `POST /api/categories`                     | Solo administrador; 201 con la categoría                           |
| `PATCH /api/categories/:id`                | Solo administrador; 200 con la categoría                           |

```json
{
  "name": "Accesos de prueba",
  "description": "Problemas con accesos internos",
  "isActive": true
}
```

`name` es obligatorio al crear: de 1 a 80 caracteres después de recortar los
extremos y único sin distinguir mayúsculas. `description` es opcional (hasta
2000 caracteres o `null`); `isActive` vale `true` por defecto. PATCH permite
cualquier combinación no vacía de estos campos.

```json
{
  "id": "6",
  "name": "Accesos de prueba",
  "description": "Problemas con accesos internos",
  "isActive": true,
  "createdAt": "2026-10-29T15:00:00.000Z",
  "updatedAt": "2026-10-29T15:00:00.000Z"
}
```

No hay DELETE. Desactivar oculta la categoría del listado habitual; los tickets
existentes conservan su FK. El futuro alta de tickets deberá comprobar también
que siga activa al crear el ticket. Un duplicado responde 409 `CATEGORY_EXISTS`;
un ID inexistente, 404 `CATEGORY_NOT_FOUND`. Pedir inactivas sin ser
administrador responde 403.

## Auditoría administrativa

El evento y la modificación se confirman o revierten juntos. `recordAudit`
inserta actor, acción, objetivo, momento e IP. La lista permitida de metadatos
valida roles, proveedor, fechas, activación y nombres de campos modificados;
rechaza campos desconocidos y texto libre. No guarda contraseñas, hashes,
tokens, nombres, correos ni el contenido de notas.

Acciones: `users.created`, `users.updated`, `users.role_changed`,
`users.expiration_changed`, `users.deactivated`, `users.reactivated`,
`users.password_reset`, `users.unlocked`, `categories.created`,
`categories.updated`, `categories.activated` y `categories.deactivated`.
Un PATCH sin cambios efectivos no genera eventos de cambio. La aplicación
solo inserta eventos: no ofrece modificación, borrado ni consulta HTTP.
El actor nulo se reserva para acciones del sistema.

Inspección local sin credenciales ni contenido sensible:

```bash
podman exec backend_postgres_1 psql -U helpdesk -d helpdesk -c \
  'SELECT id, occurred_at, actor_user_id, action, target_type, target_id, metadata, ip FROM audit_events ORDER BY id DESC LIMIT 20'
```

## Verificación y alcance

```bash
npm run db:up
npm run db:migrate
set -a
source .env
set +a
npm run check
```

La integración crea un esquema temporal con las migraciones en la base indicada
por `DATABASE_URL` y lo elimina al terminar. Cada caso crea y limpia sus datos,
sin cambiar datos de desarrollo. Necesita permiso para crear esquemas. Sin la
URL exportada se omite con un mensaje claro. No necesita Telegram ni directorio.
Para curl, usa [archivos privados y cookie jar](auth.md#probar-con-curl-sin-exponer-credenciales)
y guarda la respuesta de alta/reset en un archivo privado, sin imprimirla.

No se incluyen frontend, correo, inicio de sesión corporativo, endpoints de
tickets ni interfaz de auditoría o respaldo. El seed de categorías y sus
contraseñas de desarrollo conserva el mecanismo existente.
