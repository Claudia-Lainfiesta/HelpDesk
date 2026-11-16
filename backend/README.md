# HelpDesk · API

API con Express 5, TypeScript 6, CORS, Helmet y PostgreSQL 17.
El esquema de usuarios, roles, categorías y tickets se gestiona con migraciones SQL.
Consulta [la guía de base de datos y su diagrama ER](db/README.md).
Incluye autenticación con sesiones en el servidor. Consulta [la guía de autenticación](docs/auth.md).
Incluye [administración de usuarios, cuentas temporales y categorías](docs/users-and-categories.md),
con auditoría administrativa y [tickets reales](docs/tickets.md): alta propia,
listado, búsqueda, filtros, paginación y detalle. Incluye asignación, prioridad, transiciones, actividad, notas internas y contacto directo con el agente por Telegram. No hay comentarios públicos,
adjuntos posteriores ni SLA. Los [reportes operativos](docs/reports.md) son de solo lectura para supervisor y administrador: métricas por evento, distribuciones, tendencia y carga actual por agente. Al crear admite una imagen JPEG/PNG/WebP de hasta 10 MiB, guardada en PostgreSQL.

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
En desarrollo la API escucha en `127.0.0.1`; CORS permite credenciales y el origen exacto
configurado, sin comodines. Las peticiones POST/PUT/PATCH/DELETE requieren ese
`Origin` (o un `Referer` del mismo origen si falta). Se exige JSON salvo multipart en POST /api/tickets para su imagen inicial.

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

| Variable                    | Uso                                              | Valor predeterminado        |
| --------------------------- | ------------------------------------------------ | --------------------------- |
| `PORT`                      | Puerto HTTP entre 1 y 65535                      | `3000`                      |
| `FRONTEND_ORIGIN`           | Origen HTTP(S) exacto, sin ruta ni barra final   | `http://localhost:4200`     |
| `DATABASE_URL`              | Conexión PostgreSQL completa                     | Obligatoria                 |
| `POSTGRES_USER`             | Usuario de Compose local, no usado por la API    | Solo desarrollo             |
| `POSTGRES_PASSWORD`         | Contraseña de Compose local, no usada por la API | Solo desarrollo             |
| `POSTGRES_DB`               | Base de Compose local                            | `helpdesk`; solo desarrollo |
| `NODE_ENV`                  | `development`, `test` o `production`             | `development`               |
| `TEMP_ACCOUNT_DEFAULT_DAYS` | Duración predeterminada de cuentas temporales    | `7`                         |
| `TEMP_ACCOUNT_MAX_DAYS`     | Máximo desde la creación de la cuenta temporal   | `30`                        |

La aplicación valida estas variables al arrancar y falla con un mensaje claro
si faltan datos o los valores son inválidos. En desarrollo `.env` se busca junto
al package.json del backend. Cuando NODE_ENV=production ya está definido se usan
solo las variables del proceso (o un --env-file explícito de Node); FRONTEND_ORIGIN
es obligatorio y HTTPS. POSTGRES_* se valida en Compose, no en la aplicación.

## Scripts

| Comando                       | Acción                                                    |
| ----------------------------- | --------------------------------------------------------- |
| `npm run dev`                 | API con recarga mediante `tsx watch`                      |
| `npm run typecheck`           | Validación TypeScript sin emitir archivos                 |
| `npm run build`               | Compilar a `dist/`                                        |
| `npm start`                   | Ejecutar `dist/server.js` después de compilar             |
| `npm run db:check`            | Comprobar conexión PostgreSQL sin modificar datos         |
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
En producción, utiliza el [build y start de la raíz](../docs/deployment-render-supabase.md) para
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
Las escrituras exigen origen permitido, incluso cuando son públicas. Usan JSON, excepto POST /api/tickets que también admite multipart para la imagen inicial.
Las rutas protegidas exigen una cuenta activa, no vencida y una sesión válida.
Si la contraseña es temporal solo se permiten me, logout y change-password,
además de las rutas públicas de salud y recuperación.

| Método | Ruta                                | Acceso                                                   | Propósito y resultado                                                                                                     |
| ------ | ----------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/health`                       | Público                                                  | 200 con status, service y time; no consulta PostgreSQL                                                                    |
| GET    | `/api/health/db`                    | Público                                                  | SELECT 1; 200 o 503 DATABASE_UNAVAILABLE                                                                                  |
| POST   | `/api/auth/login`                   | Público                                                  | `{ email, password }`; perfil 200 y cookie HttpOnly, o 401 genérico/429                                                   |
| POST   | `/api/auth/logout`                  | Sin exigir sesión                                        | `{}`; revoca la actual, borra cookie, 204 idempotente                                                                     |
| GET    | `/api/auth/me`                      | Sesión; admite contraseña temporal                       | Perfil 200 o 401                                                                                                          |
| POST   | `/api/auth/change-password`         | Sesión; admite contraseña temporal                       | `{ currentPassword, newPassword }`; perfil 200, conserva sesión actual                                                    |
| POST   | `/api/auth/recovery-request`        | Público                                                  | `{ email }`; 202 genérico; aviso elegible al administrador                                                                |
| GET    | `/api/users`                        | Administrador                                            | `page,pageSize,q,role,active,temporary,expired`; página de cuentas                                                        |
| GET    | `/api/users/:id`                    | Administrador                                            | Cuenta 200 o 404 USER_NOT_FOUND                                                                                           |
| POST   | `/api/users`                        | Administrador                                            | Alta con nombre/correo/rol y temporalidad/notas opcionales; 201 y contraseña temporal una vez                             |
| PATCH  | `/api/users/:id`                    | Administrador                                            | Nombre, rol, vencimiento, notas y telegramUsername; cuenta 200; correo inmutable                                          |
| POST   | `/api/users/:id/deactivate`         | Administrador                                            | `{}`; desactiva y revoca sesiones; cuenta 200                                                                             |
| POST   | `/api/users/:id/reactivate`         | Administrador                                            | `{}`; reactiva sin renovar vencimiento; cuenta 200                                                                        |
| POST   | `/api/users/:id/reset-password`     | Administrador                                            | `{}`; revoca sesiones, limpia bloqueo, exige cambio; contraseña temporal una vez                                          |
| POST   | `/api/users/:id/unlock`             | Administrador                                            | `{}`; limpia fallos y bloqueo, conserva contraseña y sesiones                                                             |
| GET    | `/api/categories`                   | Sesión                                                   | `{ data }`; activas; includeInactive=true solo administrador                                                              |
| POST   | `/api/categories`                   | Administrador                                            | `{ name, description?, isActive? }`; categoría 201                                                                        |
| PATCH  | `/api/categories/:id`               | Administrador                                            | Campos de categoría modificados; 200; sin borrado                                                                         |
| POST   | `/api/tickets`                      | Sesión                                                   | `{ subject, description, categoryId }`; 201 y ticket completo, siempre propio/creado/sin agente                           |
| GET    | `/api/tickets`                      | Sesión                                                   | `page,pageSize,search,status,categoryId,priority`; página según permisos                                                  |
| GET    | `/api/tickets/:id`                  | Sesión                                                   | Ticket completo; 404 también para un ticket ajeno al solicitante                                                          |
| GET    | `/api/tickets/:id/attachment`       | Igual que detalle                                        | Bytes originales inline JPEG/PNG/WebP, nosniff; 404 si no hay imagen                                                      |
| GET    | `/api/tickets/assignable-agents`    | Supervisor o administrador                               | Agentes activos y no vencidos; solo id/nombre/correo                                                                      |
| PATCH  | `/api/tickets/:id/assignment`       | Agente a sí mismo; supervisor/administrador              | `{ agentId }` o null; ticket 200                                                                                          |
| POST   | `/api/tickets/:id/transitions`      | Según acción, propiedad y asignación                     | `{ action }`; ticket 200; nueve transiciones                                                                              |
| GET    | `/api/tickets/:id/events`           | Igual que detalle                                        | `page,pageSize`; actividad paginada; notas solo para soporte autorizado                                                   |
| PATCH  | `/api/tickets/:id/priority`         | Agente asignado, supervisor o administrador; no terminal | `{ priority }`; ticket 200, evento, auditoría y avisos de Urgente                                                         |
| POST   | `/api/tickets/:id/notes`            | Agente asignado, supervisor o administrador; no terminal | `{ body }`; nota 201, evento y auditoría atómicos                                                                         |
| GET    | `/api/tickets/:id/telegram-contact` | Solo propietario; no terminal y distinto del agente      | URL pública del agente con mensaje prellenado (sin envío automático) o aviso de indisponibilidad; sin efecto en el ticket |

La [matriz de permisos](../Documentacion/README.md#permisos-implementados)
refleja el núcleo actual. Los errores comunes son 400 INVALID_INPUT/INVALID_JSON,
401 AUTHENTICATION_REQUIRED/INVALID_CREDENTIALS, 403 FORBIDDEN/CSRF_REJECTED/
PASSWORD_CHANGE_REQUIRED y 415 JSON_REQUIRED. Los códigos específicos, límites,
cuerpos y ejemplos están en [auth](docs/auth.md), [usuarios/categorías](docs/users-and-categories.md),
[recuperación](docs/email-and-recovery.md) y [tickets](docs/tickets.md).
Consulta también los [ocho endpoints GET de reportes](docs/reports.md), exclusivos de supervisor y administrador.
No hay endpoints de comentarios públicos, archivos genéricos ni SLA. El contacto directo
por Telegram no requiere bot ni webhook. No hay relevo de conversaciones ni polling del bot.

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

## Telegram: contacto desde tickets

El propietario de un ticket activo puede abrir el Telegram del agente asignado.
El administrador configura el @usuario público en el formulario de Usuarios
(`telegramUsername` en POST/PATCH /api/users); se comprueba con el empleado.
No se usa un ID numérico, no hay vinculación por bot y no se inicia su proceso.
Las notas internas posteriores solo las ve soporte autorizado, mediante Actividad.
Consulta [tickets: permisos y contratos](docs/tickets.md#contacto-directo-por-telegram).

## Telegram: avisos generales al grupo

El bot de grupo solo envía avisos de creación, asignación, reasignación y cambio
a Urgente mediante `fetch` después del commit. No recibe mensajes ni requiere un
proceso adicional. Configuración y privacidad en [notificaciones](docs/notifications.md).
El contacto directo del propietario con el agente es independiente del bot.

## Tickets

Consulta [la API de tickets](docs/tickets.md): crear, listar con búsqueda/filtros y
abrir detalle. Los números TK- son generados por PostgreSQL. El solicitante solo
consulta sus tickets; los demás roles ven todos. Incluye asignación, prioridad, transiciones, actividad, notas internas y contacto directo por Telegram; no incluye comentarios públicos, adjuntos posteriores ni SLA. La imagen opcional inicial se guarda en BYTEA.

La prioridad operativa (Baja, Media, Alta, Urgente) se muestra en listado/detalle y
se filtra con priority. Nace Media. La cambia el agente asignado, supervisor o
administrador en tickets no terminales, incluido Resuelto. El propietario no gana
ese permiso. No hay cálculo, escalamiento ni SLA. El cambio a Urgente genera avisos según la guía de notificaciones.
Consulta la guía de tickets para el contrato y los controles disponibles.

La imagen inicial es opcional, máximo una y **10 MiB (10485760 bytes)**. El backend
comprueba firma real, MIME y extensión; no usa filesystem, Base64 ni almacenamiento
externo. El ticket y su imagen son atómicos. No hay subida, reemplazo o eliminación
posteriores. Consulta [el contrato y los ejemplos](docs/tickets.md#imagen-inicial-del-ticket).
Hablar por Telegram prepara solo saludo, número y asunto; el propietario decide
si envía el mensaje. HelpDesk no almacena ni sincroniza conversaciones.

## Notificaciones

[Notificaciones personales y avisos al grupo](docs/notifications.md): cuatro endpoints
privados, ocho tipos web y envío Telegram posterior al commit para creación,
asignación/reasignación y Urgente. Las migraciones 0018 y 0019 se aplican con `npm run db:migrate`.
Configura opcionalmente `TELEGRAM_BOT_TOKEN` y `TELEGRAM_SUPPORT_CHAT_ID` (grupo negativo)
en tu `.env` privado y reinicia la API. Si falta alguno no se envía nada ni falla
el arranque. No requiere un runner, polling ni webhook.

El contacto «Hablar por Telegram» continúa abriendo el deep-link personal del
agente; el bot de grupo es un canal distinto, sin lectura ni seguimiento.

## Exportación y cierre v1

[Reportes CSV](docs/reports.md#exportación-csv) permite a supervisor/administrador
exportar los tickets creados en el rango aplicado, con categoría/agente actuales.
Incluye trece columnas operativas, fechas UTC y protección contra fórmulas; no
exporta descripciones, correos, notas, Telegram ni imágenes.

El [estado final y la matriz de permisos](../docs/project-status.md) describen
el alcance local, las verificaciones y las limitaciones actuales.

## Render + Supabase PostgreSQL

[Guía de despliegue y pasos concretos](../docs/deployment-render-supabase.md).
La raíz incorpora npm run build:production y npm run start:production. En producción
Express sirve Angular desde frontend/dist/HelpDesk/browser después de la API,
escucha 0.0.0.0 y PORT, y exige FRONTEND_ORIGIN HTTPS. Render usa TRUST_PROXY=1;
las cookies conservan HttpOnly, Secure y SameSite=Lax, con Origin/CSRF estricto.

DATABASE_URL basta para PostgreSQL; POSTGRES_* solo configura Compose local.
Producción exige TLS con CA/hostname verificados; usar Session Pooler de Supabase.
`sslrootcert` en la URI permite una CA del proveedor si es necesaria. No desactivar
validación TLS. No se introduce Supabase SDK/Auth/Storage ni se usa su Data API.

`npm run db:check` comprueba conexión sin modificar datos. Migración/status/admin
siguen siendo operaciones explícitas; el start no los ejecuta. No cargar seed de
desarrollo en Supabase. El administrador inicial se crea con la herramienta de
entrada oculta existente, sin datos de prueba ni contraseñas en argumentos.

SMTP ya permite Brevo en 2525 con SMTP_SECURE=false y SMTP_REQUIRE_TLS=true;
MAIL_FROM debe ser remitente verificado y RECOVERY_ADMIN_EMAIL configura el correo
administrativo real sin incrustarlo en código. Telegram conserva sus dos usos.
