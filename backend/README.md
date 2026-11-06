# HelpDesk · API

API con Express 5, TypeScript 6, CORS, Helmet y PostgreSQL 17.
El esquema de usuarios, roles, categorías y tickets se gestiona con migraciones SQL.
Consulta [la guía de base de datos y su diagrama ER](db/README.md).
Incluye autenticación con sesiones en el servidor. Consulta [la guía de autenticación](docs/auth.md).
Incluye [administración de usuarios, cuentas temporales y categorías](docs/users-and-categories.md),
con auditoría administrativa y [tickets reales](docs/tickets.md): alta propia,
listado, búsqueda, filtros, paginación y detalle. No hay todavía asignación,
transiciones, comentarios, adjuntos, prioridad, SLA ni reportes reales.

## Desarrollo local en Fedora con Podman

Desde la raíz del repositorio:

```bash
cd backend
npm ci
cp -n .env.example .env
```

El `.env` es privado y está excluido de Git. Al crearlo,
sustituye los marcadores de `DATABASE_URL` con los valores `POSTGRES_*`:

```dotenv
DATABASE_URL=postgresql://<usuario>:<contrasena>@localhost:5432/<base>
```

Codifica los caracteres especiales de usuario y contraseña en la URL.
Las credenciales del ejemplo son exclusivamente para desarrollo local.
Las variables del proceso tienen prioridad sobre `.env`.

```bash
podman --version
podman compose version
npm run db:up
npm run db:migrate
npm run db:seed:dev
npm run dev
```

En otra terminal, desde la raíz: `cd frontend` y `npm start`.
API: http://localhost:3000. Frontend permitido: http://localhost:4200.
La API escucha solo en `127.0.0.1`; CORS permite credenciales y el origen exacto
configurado, sin comodines. Las peticiones POST/PUT/PATCH/DELETE requieren ese
`Origin` (o un `Referer` del mismo origen si falta) y `Content-Type: application/json`.

Si falta el proveedor de Compose, ejecuta tú mismo:

```bash
sudo dnf install podman-compose
```

Si PostgreSQL del sistema ocupa el puerto 5432 y quieres usar el contenedor,
detén ese servicio antes de `npm run db:up`:

```bash
sudo systemctl stop postgresql.service
```

El contenedor usa un volumen nombrado y publica únicamente
`127.0.0.1:5432`. No se usan bind mounts; no se necesita una etiqueta SELinux `:Z`.
PostgreSQL crea la base configurada al inicializar un volumen vacío.
Cambiar `POSTGRES_*` en `.env` no cambia las credenciales de un volumen ya inicializado.

## Variables

| Variable                    | Uso                                            | Valor predeterminado    |
| --------------------------- | ---------------------------------------------- | ----------------------- |
| `PORT`                      | Puerto HTTP entre 1 y 65535                    | `3000`                  |
| `FRONTEND_ORIGIN`           | Origen HTTP(S) exacto, sin ruta ni barra final | `http://localhost:4200` |
| `DATABASE_URL`              | Conexión PostgreSQL completa                   | Obligatoria             |
| `POSTGRES_USER`             | Usuario de PostgreSQL                          | Obligatoria             |
| `POSTGRES_PASSWORD`         | Contraseña de PostgreSQL                       | Obligatoria             |
| `POSTGRES_DB`               | Base de datos                                  | `helpdesk`              |
| `NODE_ENV`                  | `development`, `test` o `production`           | `development`           |
| `TEMP_ACCOUNT_DEFAULT_DAYS` | Duración predeterminada de cuentas temporales  | `7`                     |
| `TEMP_ACCOUNT_MAX_DAYS`     | Máximo desde la creación de la cuenta temporal | `30`                    |

La aplicación valida estas variables al arrancar y falla con un mensaje claro
si faltan datos o los valores son inválidos. `.env` se busca junto al
`package.json` del backend, incluso al ejecutar el servidor desde otra carpeta.

## Scripts

| Comando                       | Acción                                                    |
| ----------------------------- | --------------------------------------------------------- |
| `npm run dev`                 | API con recarga mediante `tsx watch`                      |
| `npm run typecheck`           | Validación TypeScript sin emitir archivos                 |
| `npm run build`               | Compilar a `dist/`                                        |
| `npm start`                   | Ejecutar `dist/server.js` después de compilar             |
| `npm run db:up`               | Crear/iniciar PostgreSQL y esperar al healthcheck         |
| `npm run db:down`             | Detener todos los servicios Compose conservando volúmenes |
| `npm run db:logs`             | Seguir los registros de PostgreSQL                        |
| `npm run db:migrate`          | Aplicar migraciones pendientes                            |
| `npm run db:status`           | Listar migraciones aplicadas y pendientes                 |
| `npm run db:new -- nombre`    | Crear la siguiente migración SQL                          |
| `npm run db:reset`            | Recrear public y migrar, solo en desarrollo local         |
| `npm run db:seed:dev`         | Cargar ejemplos idempotentes, solo en desarrollo local    |
| `npm run user:create-admin`   | Crear un administrador con contraseña de entrada oculta   |
| `npm run auth:purge-sessions` | Eliminar sesiones vencidas o revocadas hace más de 7 días |
| `npm run test:db`             | Probar las herramientas en una base temporal aislada      |
| `npm run test:server`         | Verificar el manejo de un puerto ocupado                  |
| `npm run lint`                | ESLint, sin avisos permitidos                             |
| `npm run lint:fix`            | Corregir automáticamente lo que permita ESLint            |
| `npm run format`              | Aplicar Prettier                                          |
| `npm run format:check`        | Verificar formato sin escribir                            |
| `npm test`                    | Vitest y Supertest, una sola ejecución                    |
| `npm run test:watch`          | Vitest en modo watch                                      |
| `npm run check`               | Lint, formato, tipos, pruebas y build en orden            |

`SIGINT` y `SIGTERM` cierran el servidor HTTP y el pool de conexiones.
En producción, ejecuta con `NODE_ENV=production npm start` detrás de HTTPS para
usar la cookie `__Host-hd_session` con `Secure`. Los errores siempre omiten
stack traces y usan `{ error: { code, message } }`.

`check` se detiene ante el primer fallo. `typecheck` valida también los tests
y la configuración de Vitest; `build` emite solo el código de `src/`.
Se usa Node >=22.23.1; `.nvmrc` fija 22.23.1 para el equipo y CI.
Con nvm: `nvm install` y `nvm use` dentro de esta carpeta.

Las pruebas unitarias de `npm test` usan configuraciones aisladas y no necesitan
PostgreSQL. Las integraciones de autenticación y `/api/health/db` usan la base real y solo se ejecutan
si `DATABASE_URL` está exportada. Si falta, se informa un SKIP; no se carga el
`.env` automáticamente para decidirlo. Cada prueba de autenticación crea y elimina
sus propios usuarios y sesiones, sin cambiar los ejemplos. La integración de
usuarios/categorías crea y elimina un esquema aislado en la base indicada
(requiere permiso para crear esquemas). Para incluir la integración local:

```bash
npm run db:up
npm run db:migrate
set -a
source .env
set +a
npm run check
```

`test:db` y `test:server` conservan las pruebas adicionales de migraciones y
arranque con `node:test`; se ejecutan aparte del chequeo de Vitest. `test:db`
requiere desarrollo local y permiso CREATEDB.

Para probar cuentas, ejecuta `npm run db:seed:dev`. `SEED_DEV_PASSWORD` permite
elegir una contraseña de desarrollo; si está vacía, se genera un valor aleatorio
local en `.seed-dev-password` (ignorado por Git, permisos 600). El seed solo
crea los ejemplos con hash de contraseña; repetirlo no la
restablece. La [guía de autenticación](docs/auth.md) explica cómo probar el acceso
sin poner contraseñas en argumentos ni mostrar cookies en la terminal.

Prettier comparte las opciones del frontend. No procesa `.env`, dependencias,
artefactos generados, lockfiles ni SQL: las migraciones aplicadas son inmutables
y Prettier no incluye un parser SQL. Los argumentos `_req` de middleware pueden
permanecer sin usar, pues forman parte de la firma de Express.

Consulta la [guía de contribución](../Documentacion/Guia-de-contribucion.md).

## Endpoints implementados

El prefijo es `/api`. Todos los errores usan `{ error: { code, message } }`.
Las escrituras exigen JSON y origen permitido, incluso cuando son públicas.
Las rutas protegidas exigen una cuenta activa, no vencida y una sesión válida.
Si la contraseña es temporal solo se permiten me, logout y change-password,
además de las rutas públicas de salud y recuperación.

| Método | Ruta                            | Acceso                             | Propósito y resultado                                                                           |
| ------ | ------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------- |
| GET    | `/api/health`                   | Público                            | 200 con status, service y time; no consulta PostgreSQL                                          |
| GET    | `/api/health/db`                | Público                            | SELECT 1; 200 o 503 DATABASE_UNAVAILABLE                                                        |
| POST   | `/api/auth/login`               | Público                            | `{ email, password }`; perfil 200 y cookie HttpOnly, o 401 genérico/429                         |
| POST   | `/api/auth/logout`              | Sin exigir sesión                  | `{}`; revoca la actual, borra cookie, 204 idempotente                                           |
| GET    | `/api/auth/me`                  | Sesión; admite contraseña temporal | Perfil 200 o 401                                                                                |
| POST   | `/api/auth/change-password`     | Sesión; admite contraseña temporal | `{ currentPassword, newPassword }`; perfil 200, conserva sesión actual                          |
| POST   | `/api/auth/recovery-request`    | Público                            | `{ email }`; 202 genérico; aviso elegible al administrador                                      |
| GET    | `/api/users`                    | Administrador                      | `page,pageSize,q,role,active,temporary,expired`; página de cuentas                              |
| GET    | `/api/users/:id`                | Administrador                      | Cuenta 200 o 404 USER_NOT_FOUND                                                                 |
| POST   | `/api/users`                    | Administrador                      | Alta con nombre/correo/rol y temporalidad/notas opcionales; 201 y contraseña temporal una vez   |
| PATCH  | `/api/users/:id`                | Administrador                      | Nombre, rol, vencimiento y notas; cuenta 200; correo inmutable                                  |
| POST   | `/api/users/:id/deactivate`     | Administrador                      | `{}`; desactiva y revoca sesiones; cuenta 200                                                   |
| POST   | `/api/users/:id/reactivate`     | Administrador                      | `{}`; reactiva sin renovar vencimiento; cuenta 200                                              |
| POST   | `/api/users/:id/reset-password` | Administrador                      | `{}`; revoca sesiones, limpia bloqueo, exige cambio; contraseña temporal una vez                |
| POST   | `/api/users/:id/unlock`         | Administrador                      | `{}`; limpia fallos y bloqueo, conserva contraseña y sesiones                                   |
| GET    | `/api/categories`               | Sesión                             | `{ data }`; activas; includeInactive=true solo administrador                                    |
| POST   | `/api/categories`               | Administrador                      | `{ name, description?, isActive? }`; categoría 201                                              |
| PATCH  | `/api/categories/:id`           | Administrador                      | Campos de categoría modificados; 200; sin borrado                                               |
| POST   | `/api/tickets`                  | Sesión                             | `{ subject, description, categoryId }`; 201 y ticket completo, siempre propio/creado/sin agente |
| GET    | `/api/tickets`                  | Sesión                             | `page,pageSize,search,status,categoryId`; página según permisos                                 |
| GET    | `/api/tickets/:id`              | Sesión                             | Ticket completo; 404 también para un ticket ajeno al solicitante                                |

La [matriz de permisos](../Documentacion/README.md#permisos-implementados)
refleja el núcleo actual. Los errores comunes son 400 INVALID_INPUT/INVALID_JSON,
401 AUTHENTICATION_REQUIRED/INVALID_CREDENTIALS, 403 FORBIDDEN/CSRF_REJECTED/
PASSWORD_CHANGE_REQUIRED y 415 JSON_REQUIRED. Los códigos específicos, límites,
cuerpos y ejemplos están en [auth](docs/auth.md), [usuarios/categorías](docs/users-and-categories.md),
[recuperación](docs/email-and-recovery.md) y [tickets](docs/tickets.md).
No hay endpoints de asignación, transiciones, comentarios, archivos, SLA o
reportes. Telegram solo tiene scripts de POC, sin webhook ni endpoint HTTP.

## Comprobaciones

```bash
npm run typecheck
npm run build
curl -i http://localhost:3000/api/health
curl -i http://localhost:3000/api/health/db
curl -i -H 'Origin: http://localhost:4200' http://localhost:3000/api/health
curl -i http://localhost:4200/api/health
```

- `/api/health`: `200`, `{ status: "ok", service: "helpdesk-api", time }`.
- `/api/health/db`: ejecuta `SELECT 1`; `200` si responde PostgreSQL o `503`
  con un mensaje genérico si falla, sin detalles internos.
- CORS devuelve `Access-Control-Allow-Origin: http://localhost:4200` con
  la configuración predeterminada.

`app.ts` configura Express sin escuchar puertos; `server.ts` controla el
arranque y cierre. `src/config/`, `src/db/`, `src/routes/` y `src/middlewares/`
separan configuración, conexión, rutas y manejo de errores.

## Correo y recuperación asistida

Consulta [correo SMTP y recuperación](docs/email-and-recovery.md) para el flujo,
las variables y los perfiles Mailpit/Brevo. La solicitud pública solo avisa al
administrador; la contraseña temporal sigue mostrándose una vez en HelpDesk y
se entrega por otro medio, nunca por correo.

```bash
npm run mail:up
npm run mail:check
npm run mail:logs
```

Mailpit está en http://127.0.0.1:8025 y su SMTP en 127.0.0.1:1025. Define
`MAIL_FROM` y `RECOVERY_ADMIN_EMAIL` en `.env`; el resto tiene valores locales
predeterminados. `SMTP_USER` y `SMTP_PASSWORD` quedan vacíos para Mailpit.
`mail:check` verifica sin enviar y sin mostrar credenciales. `db:up` sigue
comprobando solo PostgreSQL; `db:down` detiene todos los servicios del compose.
El aviso se ejecuta como tarea best effort sin cola persistente ni reintentos.

## Telegram (desarrollo)

Prueba de concepto S0-06 con grammY, long polling y sesiones en memoria. La API
no inicia el bot y sigue funcionando sin `TELEGRAM_BOT_TOKEN`. Los scripts del
bot tampoco necesitan PostgreSQL: no importan la configuración ni el pool de la API.

1. Abre [@BotFather](https://t.me/BotFather) y usa `/newbot`. Elige el nombre y
   el username de tu bot de pruebas siguiendo sus indicaciones.
2. Guarda la credencial que te entregue **solo en tu `.env` local**, en
   `TELEGRAM_BOT_TOKEN`. No la compartas, la agregues a Git ni la pegues en logs.
   `.env.example` mantiene el valor vacío.
3. Cada integrante del equipo usa **su propio bot**. Un token solo debe tener
   un proceso de polling activo. Las dos cuentas de una prueba conversan con
   el mismo bot, atendido por ese único proceso.

Desde `backend/`:

```bash
npm run telegram:check
npm run telegram:dev
```

`telegram:check` consulta `getMe` y muestra el username, el ID del bot y un
resumen del webhook. Omite la URL y el detalle de errores del webhook porque
pueden contener datos privados. Si hay un webhook activo, puedes quitarlo
explícitamente antes de iniciar el polling:

```bash
npm run telegram:check -- --delete-webhook
```

El flag conserva las actualizaciones pendientes; no se elimina el webhook al
arrancar el bot. Un error 409 explica que puede existir otro proceso de polling
o un webhook activo. Detén la otra instancia con Ctrl+C antes de reiniciar.

`TELEGRAM_ALLOWED_USER_IDS` acepta IDs positivos separados por comas. Vacío
permite a cualquier persona en un chat privado. Para obtener los IDs, deja
inicialmente la lista vacía, abre tu bot desde cada cuenta y envía `/miid`.
Después configura ambos IDs y reinicia. Una persona fuera de la lista se
ignora por completo, incluso si envía `/miid`.

### Guion manual con dos cuentas

1. Cada cuenta abre el mismo bot y envía `/start`.
2. La primera envía `/ticket TK-000001 solicitante`.
3. Antes de unir la segunda, envía un mensaje desde la primera: debe avisar
   que falta el otro lado. Ese mensaje no se entrega después ni se pone en cola.
4. La segunda envía `/ticket TK-000001 agente`.
5. Intercambia mensajes en ambos sentidos, luego fotos, documentos y voz.
   Al cambiar quien habla aparece una etiqueta con rol y referencia; varios
   mensajes consecutivos del mismo emisor no repiten la etiqueta.
6. Usa `/estado` en ambos chats. Desde la segunda cuenta, usa `/salir` y
   confirma que la primera vuelve a ver que falta el otro lado. La segunda
   puede volver a ocupar el rol con `/ticket`.
7. Para probar un fallo de entrega, bloquea el bot desde una cuenta e intenta
   escribir desde la otra. Debe avisar que no pudo confirmar la entrega y
   seguir atendiendo comandos. Desbloquea y envía `/start` para continuar.

Todas las referencias deben tener `TK-` y al menos seis dígitos. La POC no
verifica su existencia en la base ni crea tickets. El rol elegido aquí solo
empareja chats; no asigna responsables reales. Las sesiones se pierden al
reiniciar, incluida una recarga de `tsx watch`.

El texto plano y los archivos enviados aquí son conversación para el otro
participante, **no notas internas**. La POC no consume notas del HelpDesk y no
reenvía comandos, incluido un `/nota` desconocido.

Los envíos no se reintentan. Si falla una copia o su etiqueta, se avisa al emisor;
si también falla ese aviso, queda un resultado fallido con IDs en el log. Una
etiqueta ya enviada puede quedar sin su copia. Ante un error de red no siempre
se puede saber si Telegram alcanzó a entregar el mensaje: el aviso indica que
no se confirmó la entrega. Un fallo del polling detiene el proceso con error;
se reinicia manualmente. No hay cola persistente ni cambios de estado del ticket.

Los logs de Telegram solo incluyen IDs, tipo de actualización, resultado y
código de error, sin textos, archivos, credenciales ni errores originales.
Las pruebas automáticas usan pasarelas falsas y no necesitan token ni red de
Telegram: `npm run check`. La integración PostgreSQL previa conserva su skip
habitual si no está exportada `DATABASE_URL`.

Consulta los [hallazgos técnicos para EP-06](../Documentacion/Telegram-prueba-de-concepto.md).

## Tickets

Consulta [la API de tickets](docs/tickets.md): crear, listar con búsqueda/filtros y
abrir detalle. Los números TK- son generados por PostgreSQL. El solicitante solo
consulta sus tickets; los demás roles ven todos. No incluye asignación ni
cambios de estado.
