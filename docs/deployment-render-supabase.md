# Despliegue: Render + Supabase PostgreSQL

El repositorio queda preparado para **una Web Service Node** con Express 5 y
Angular estático, sin despliegue realizado desde esta revisión. Frontend y API
comparten origen HTTPS. No se usa Supabase Auth, SDK, Storage ni su Data API.

## Arquitectura y rutas

Express resuelve primero `/api/*`, incluido `/api/health`; un `/api` desconocido
conserva error JSON, nunca index.html. Solo en producción sirve los archivos de
`frontend/dist/HelpDesk/browser/` y después usa `/{*ruta}` como fallback SPA GET/HEAD.
Assets inexistentes no devuelven HTML. El índice se revalida sin cache persistente.
Se desactiva inlineCritical de Angular para no generar scripts inline bloqueados
por Helmet. CSP mantiene script-src self y script-src-attr none; solo img-src
admite blob: para las imágenes ya validadas de creación/detalle. No se habilitan
scripts unsafe-inline ni se quita Helmet.
La ruta al build se calcula desde el módulo, no desde el directorio del shell;
si falta index.html, el arranque falla con instrucciones de build.

La sesión y el cambio obligatorio se evalúan en `/api`, no en assets/SPA: el
navegador necesita poder cargar Angular antes de resolver sus guardas.
Angular ya usa `/api` relativo, con `withCredentials: true`. No se añade URL
pública del backend al frontend ni se incluyen variables secretas en el bundle.
En desarrollo se conservan `npm start` de Angular, el proxy y `npm run dev` backend.

## Render

Crear manualmente **Web Service**, runtime **Node**, repositorio/rama elegidos.
**Root Directory vacío** (raíz del repositorio), no backend ni frontend.

| Ajuste            | Valor                                       |
| ----------------- | ------------------------------------------- |
| Build Command     | `npm run build:production`                  |
| Start Command     | `npm run start:production`                  |
| Health Check Path | `/api/health`                               |
| Node              | `22.23.1`, fijado también por `.nvmrc` raíz |

Build instala frontend/backend con `npm ci --include=dev` y sus lockfiles; necesita
herramientas de desarrollo aunque NODE_ENV sea production. No actualiza versiones.
Compila Angular (configuración production predeterminada), verifica producción,
limpia backend/dist y compila TypeScript. Start ejecuta únicamente
`NODE_ENV=production node backend/dist/server.js`. No inicia servidores de desarrollo
ni herramientas de migración. No se requiere Podman en Render.

Render proporciona PORT; Express escucha `0.0.0.0:PORT` en producción, con fallback 3000. En local escucha 127.0.0.1. Render termina HTTPS antes de Express. Definir
`TRUST_PROXY=1` para su proxy; si agregas otro proxy/CDN, revisar el número real de
saltos en vez de confiar en cualquier cabecera. El origen autorizado es explícito,
HTTPS, sin path/barra final; no se calcula desde Host/X-Forwarded-Host del cliente.

Cookies: `__Host-hd_session`, HttpOnly, Secure, SameSite=Lax, Path=/, sin Domain.
Se conserva comprobación exacta de Origin/Referer y JSON/multipart en escrituras;
no hay CORS wildcard. No cambiar SameSite a None ni desactivar Secure.

En producción se utilizan variables del proceso; no se carga backend/.env si
NODE_ENV=production ya está definido. El build no necesita conectarse a Supabase
ni recibir credenciales de DB, SMTP o Telegram.

## Variables exactas de Render

No copies el .env local completo. Configura las siguientes en el panel de Render.
Los valores descriptivos de esta tabla no son valores literales para pegar.

| Variable                                      | Qué poner                                                                                        | Clasificación                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| NODE_ENV                                      | `production`                                                                                     | Obligatoria, producción                                              |
| NODE_VERSION                                  | `22.23.1`; prevalece sobre .nvmrc si se define                                                   | Opcional, producción; recomendado explícito                          |
| PORT                                          | Lo proporciona Render; no fijar manualmente                                                      | Automática, producción                                               |
| FRONTEND_ORIGIN                               | Origen HTTPS real de tu servicio Render, sin barra final                                         | Obligatoria, producción                                              |
| TRUST_PROXY                                   | `1` para el proxy de Render                                                                      | Obligatoria en este despliegue                                       |
| DATABASE_URL                                  | URI privada del **Session Pooler** de Supabase con contraseña codificada y `sslmode=verify-full` | Obligatoria, secreta, producción                                     |
| SMTP_HOST                                     | `smtp-relay.brevo.com` si usas Brevo                                                             | Obligatoria para correo real                                         |
| SMTP_PORT                                     | `2525` en Render Free con Brevo                                                                  | Obligatoria para correo real                                         |
| SMTP_SECURE                                   | `false` con 2525, no TLS implícito                                                               | Obligatoria para este perfil                                         |
| SMTP_REQUIRE_TLS                              | `true` para exigir STARTTLS                                                                      | Obligatoria para este perfil                                         |
| SMTP_USER                                     | Login SMTP indicado por Brevo, no asumir que es el correo del proyecto                           | Obligatoria con Brevo                                                |
| SMTP_PASSWORD                                 | Clave **SMTP** de Brevo, no API key REST ni contraseña de Gmail                                  | Obligatoria, secreta, con Brevo                                      |
| MAIL_FROM                                     | Remitente verificado/autorizado en Brevo                                                         | Obligatoria                                                          |
| RECOVERY_ADMIN_EMAIL                          | Correo administrativo del proyecto indicado por su propietario                                   | Obligatoria; nombre real de la variable, no ADMIN_NOTIFICATION_EMAIL |
| TELEGRAM_BOT_TOKEN                            | Token privado del bot de avisos generales                                                        | Opcional, secreto; omitir/deshabilitar si no se usará                |
| TELEGRAM_SUPPORT_CHAT_ID                      | ID negativo del grupo/supergrupo de soporte                                                      | Opcional; necesario junto al token para enviar                       |
| SESSION_IDLE_MINUTES                          | `30` por defecto                                                                                 | Opcional                                                             |
| SESSION_ABSOLUTE_HOURS                        | `8` por defecto                                                                                  | Opcional                                                             |
| LOGIN_MAX_ATTEMPTS                            | `5` por defecto                                                                                  | Opcional                                                             |
| LOGIN_LOCK_MINUTES                            | `15` por defecto                                                                                 | Opcional                                                             |
| LOGIN_RATE_LIMIT_PER_IP                       | `30` por defecto                                                                                 | Opcional                                                             |
| TEMP_ACCOUNT_DEFAULT_DAYS                     | `7` por defecto                                                                                  | Opcional                                                             |
| TEMP_ACCOUNT_MAX_DAYS                         | `30` por defecto                                                                                 | Opcional                                                             |
| RECOVERY_RATE_LIMIT_PER_IP                    | `10` por defecto                                                                                 | Opcional                                                             |
| RECOVERY_RATE_LIMIT_PER_EMAIL                 | `3` por defecto                                                                                  | Opcional                                                             |
| POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB | Solo Compose local; **no definir en Render**                                                     | Solo desarrollo                                                      |
| SEED_DEV_PASSWORD                             | Solo seed local; **no definir en Render**                                                        | Solo desarrollo, secreto si se utiliza                               |

El correo real del proyecto no se escribe en el repositorio: se asigna a
RECOVERY_ADMIN_EMAIL y, si Brevo lo permite y está verificado, a MAIL_FROM.
SMTP 2525 ya era configurable; se conserva Nodemailer con validación de certificados,
STARTTLS obligatorio y sin debug. Render Free bloquea SMTP 25/465/587. Verifica el
perfil elegido con `node --env-file=backend/.env.supabase.local backend/dist/mail/check.js`:
verifica conexión/autenticación, no envía correo ni imprime secretos.

Los dos usos de Telegram permanecen iguales: contacto directo del propietario al
agente con username/borrador, y avisos generales del bot después del commit.
No se leen conversaciones ni se guarda contenido del chat; no se añade bot runner.

## Supabase y SSL

Usar Connect → **Session pooler**, no Transaction pooler. El proceso es persistente
y las migraciones utilizan locks de sesión. Mantener host/puerto/usuario/base de la
URI que ofrece tu proyecto; no inferirlos ni cambiarlos por valores de ejemplo.
La contraseña con caracteres reservados debe codificarse como componente de URL.
Nunca poner la URI en argumentos del shell, capturas, Git o frontend.

El parser exige TLS con certificado y hostname verificados en producción. Añade
`sslmode=verify-full` a la URI (`?` si no tenía parámetros, `&` si ya tenía).
Un sslmode=require se eleva a verify-full; modos sin validación se rechazan.
Se utiliza el driver pg existente en pool, migraciones y admin. No se configura
rejectUnauthorized=false ni se usa NODE_TLS_REJECT_UNAUTHORIZED=0.

Si la cadena de certificados no es confiable para Node, descarga la CA de tu
proyecto desde Database Settings → SSL Configuration. Añade
`sslrootcert=/ruta/absoluta/al/certificado.crt` a la URI privada. En Render carga
la CA como Secret File y usa su ruta `/etc/secrets/...`; la ruta local y la ruta
Render son diferentes. No desactives la validación para resolver un error de CA.
El certificado raíz es público, pero no hace falta versionarlo.

**Desactivar Data API** en la configuración de Supabase antes de cargar tablas:
HelpDesk autoriza el acceso en Express y no usa las APIs autogeneradas de Supabase.
No dejar las tablas de usuarios/sesiones expuestas por otro canal. Si ese proyecto
ya utiliza Data API para otra aplicación, no desactivarla indiscriminadamente:
separar HelpDesk en un proyecto dedicado o definir antes permisos/RLS adecuados.
Esta preparación no modifica ni activa RLS en las migraciones históricas.

## Migraciones y administrador

No hay migraciones al arrancar ni durante el build. Se ejecutan explícitamente,
después de compilar y antes de abrir la aplicación a usuarios:

```bash
node --env-file=backend/.env.supabase.local backend/dist/db/check.js
node --env-file=backend/.env.supabase.local backend/dist/db/cli.js migrate
node --env-file=backend/.env.supabase.local backend/dist/db/cli.js status
node --env-file=backend/.env.supabase.local backend/dist/auth/create-admin.js
```

Desde Render Shell (si tu plan la incluye), con sus variables ya definidas y desde
la raíz, los equivalentes son `npm run db:check`, `npm run db:migrate`,
`npm run db:status` y `npm run user:create-admin`. Render Free no ofrece Shell:
puedes ejecutar las cuatro instrucciones locales de arriba contra Supabase.

El creador de administrador **ya existe**: requiere terminal interactiva, pide
correo y nombre y lee contraseña/confirmación con entrada oculta. Aplica la política
actual, Argon2id y crea solo un administrador local con cambio obligatorio desactivado.
No imprime la contraseña ni la acepta por argumentos. Si el correo ya existe,
falla limpiamente sin cambiarlo. No hace falta otro bootstrap con password en env.

Hay 19 migraciones actuales. Crean esquema/catálogos, no usuarios ni tickets de
prueba. Comprobar en Table Editor del esquema public: schema_migrations, roles,
ticket_statuses, users, sessions, categories, tickets, ticket_events, ticket_notes,
ticket_attachments, notifications y audit_events. Antes del bootstrap no hay
usuarios; después solo el administrador creado. Tickets y categorías permanecen
vacíos: configura las categorías y empleados reales desde la administración web.

**No ejecutar** db:seed:dev, db:reset ni el SQL de seeds/dev.sql contra Supabase.
No existe seed de producción. El CLI rechaza seed/reset si NODE_ENV no es development
o si el host no es local. No editar migraciones ya aplicadas ni sus checksums.

## PASOS QUE DEBO HACER AHORA

1. En una terminal nueva, desde la raíz, ejecutar `npm run build:production`.
   Esto no usa tu URI ni envía correo/Telegram.
2. Desactivar Data API en el proyecto Supabase dedicado. Confirmar en Connect que
   la URI copiada es Session pooler y configurar SSL/CA como se explicó.
3. Crear **backend/.env.supabase.local** con el editor; ya está ignorado por Git.
   No pegar la URI en comandos ni compartir el archivo. Restringir permisos:
   `chmod 600 backend/.env.supabase.local`. Contenido privado mínimo:

   ```dotenv
   NODE_ENV=production
   DATABASE_URL=<URI privada del Session Pooler con sslmode=verify-full>
   FRONTEND_ORIGIN=https://pendiente.example.invalid
   MAIL_FROM=remitente@example.invalid
   RECOVERY_ADMIN_EMAIL=administracion@example.invalid
   ```

   Las direcciones/origen ficticios sirven solo para ejecutar herramientas de DB,
   que no envían correo; no sirven para iniciar el sitio público. Evitar variables
   DATABASE_URL/NODE_ENV/FRONTEND_ORIGIN antiguas exportadas en el shell, porque las
   variables existentes prevalecen sobre --env-file. Este archivo no carga .env local.

4. Probar conexión sin modificar datos:
   `node --env-file=backend/.env.supabase.local backend/dist/db/check.js`.
5. Aplicar migraciones:
   `node --env-file=backend/.env.supabase.local backend/dist/db/cli.js migrate`.
6. Revisar estado:
   `node --env-file=backend/.env.supabase.local backend/dist/db/cli.js status`.
   Confirmar 19 aplicadas y cero pendientes; comprobar las tablas descritas en Table Editor.
7. No ejecutar seed/reset. Crear tu administrador con
   `node --env-file=backend/.env.supabase.local backend/dist/auth/create-admin.js`.
   Usar el correo elegido y una contraseña propia mediante la entrada oculta.
8. Revisar `git status` y `git diff`; confirmar que no aparecen archivos privados.
   Después hacer tú el commit/push de los cambios revisados. Esta tarea no hace commits.
9. Crear la única Web Service de Render, raíz vacía, comandos y health de esta guía.
   Copiar la URI privada a DATABASE_URL, configurar el resto de la tabla y cambiar
   FRONTEND_ORIGIN al origen HTTPS real de Render. Adaptar sslrootcert si usas CA.
   No copiar POSTGRES_* ni SEED_DEV_PASSWORD. No pegar la URI en Build/Start Command.
10. Configurar SMTP 2525/STARTTLS, remitente verificado y el correo administrativo
    del proyecto; Telegram de grupo es opcional. Completar el deploy, comprobar
    `/api/health`, abrir `/iniciar-sesion`, entrar con el administrador y refrescar
    `/tickets` para probar SPA/cookie. Crear las categorías y cuentas reales necesarias
    desde Usuarios/Categorías, sin seed. Comprobar recuperación y Telegram con cuentas
    reales solo cuando decidas hacer esos envíos.

## Verificación realizada en esta preparación

| Comprobación               | Resultado                                                                                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Backend npm run check      | Lint, formato, tipos, 447 pruebas en 24 archivos y build correctos; PostgreSQL local real, sin skips                                                                     |
| Frontend npm run check     | Lint, lint:tokens, formato, tipos, prueba del linter, 309 pruebas en 22 archivos, build y verify:production correctos                                                    |
| Build exacto Render        | npm run build:production desde raíz: instalación con lockfiles, ambos builds y guía excluida, sin errores                                                                |
| Start exacto Render        | npm run start:production: servidor compilado escucha 0.0.0.0 y PORT; no migra ni hace seed                                                                               |
| Aplicación servida         | index.html real, CSS, scripts y rutas profundas; sin frontend de desarrollo                                                                                              |
| API y health               | health 200, API inexistente JSON 404, asset inexistente 404, CSRF rechaza origen ajeno y admite POST autorizado                                                          |
| Cookie producción          | __Host-hd_session, HttpOnly, Secure, SameSite=Lax, Path=/, sin Domain; probada también en login por integración                                                          |
| Navegador                  | Brave headless con HTTPS del proxy simulado y proceso Express real: Angular inicia, CSS e imagen Blob cargan, sin scripts inline/violaciones CSP ni errores de ejecución |
| Origen                     | Todas las peticiones del navegador al mismo origen HTTPS; ninguna a localhost/127.0.0.1                                                                                  |
| Herramientas adicionales   | test:db: 10 pruebas correctas; test:server: 1 correcta; fixture de producción actualizado a HTTPS                                                                        |
| Migraciones                | 19 desde cero en base desechable local y status sin pendientes; base eliminada, datos del usuario conservados                                                            |
| Backend aislado de Angular | Check verificado temporalmente sin output Angular; pruebas de cookies no requieren build frontend previo, compatible con CI separado                                     |
| Configuración/secretos     | URI, contraseñas y tokens reales no introducidos; .env.supabase.local y .env ignorados; no correo del proyecto incrustado                                                |

No se creó infraestructura ni se utilizó una URI Supabase. La conexión real a ese
proyecto, su CA particular, el SMTP real, la entrega Telegram y el dominio/proxy
reales de Render quedan para los pasos manuales anteriores. Las referencias a
localhost en configuración/guías/pruebas son desarrollo; producción usa origen
HTTPS y URI/proveedor externos configurados por env.

Se reutilizaron health, administrador interactivo, SMTP y Telegram. No hay seed
productivo, nuevas dependencias, Supabase SDK, cambios de reglas de negocio ni
migraciones nuevas. Los únicos ajustes adicionales necesarios fueron CSP/CSS
crítico y limitar el middleware de sesión a /api para servir la SPA correctamente.

## Archivos de esta preparación

### Modificados

- `Documentacion/Guia-de-contribucion.md`
- `Documentacion/README.md`
- `backend/.env.example`
- `backend/README.md`
- `backend/db/README.md`
- `backend/docs/auth.md`
- `backend/docs/email-and-recovery.md`
- `backend/package.json`
- `backend/src/app.ts`
- `backend/src/config/env.ts`
- `backend/src/server.ts`
- `backend/test/db-tools.test.ts`
- `backend/test/integration/auth.test.ts`
- `backend/test/unit/app.test.ts`
- `backend/test/unit/configuration.test.ts`
- `backend/test/unit/mail.test.ts`
- `docs/project-status.md`
- `frontend/README.md`
- `frontend/angular.json`

### Creados

- `.gitignore`
- `.nvmrc`
- `README.md`
- `backend/src/config/database.ts`
- `backend/src/db/check.ts`
- `backend/src/frontend.ts`
- `backend/test/unit/production.test.ts`
- `docs/deployment-render-supabase.md`
- `package-lock.json`
- `package.json`
- `scripts/build-production.mjs`

## Fuentes oficiales

- [Render: Web Services, PORT y 0.0.0.0](https://render.com/docs/web-services).
- [Render: Node](https://render.com/docs/node-version) y [límites Free/SMTP/Shell](https://render.com/docs/free).
- [Supabase: Session pooler y SSL](https://supabase.com/docs/guides/database/connecting-to-postgres).
- [Supabase: SSL y CA](https://supabase.com/docs/guides/platform/ssl-enforcement).
- [Supabase: desactivar Data API cuando solo se usa PostgreSQL](https://supabase.com/docs/guides/api/securing-your-api).
- [node-postgres: SSL y parámetros de URI](https://node-postgres.com/features/ssl).
- [Brevo: puertos SMTP](https://help.brevo.com/hc/en-us/articles/10905415650322-Which-SMTP-port-should-I-use-Port-587-465-or-2525).
- [Express 5: wildcard de rutas](https://expressjs.com/en/guide/migrating-5/).
