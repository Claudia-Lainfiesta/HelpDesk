# HelpDesk · API

API con Express 5, TypeScript 6, CORS, Helmet y PostgreSQL 17.
El esquema de usuarios, roles, categorías y tickets se gestiona con migraciones SQL.
Consulta [la guía de base de datos y su diagrama ER](db/README.md).
Incluye autenticación con sesiones en el servidor. Consulta [la guía de autenticación](docs/auth.md).
Todavía no hay administración de usuarios ni endpoints de tickets.

## Desarrollo local en Fedora con Podman

Desde la raíz del repositorio:

```bash
cd backend
npm ci
cp -n .env.example .env
```

El `.env` local ya está preparado y excluido de Git. Si lo creas de nuevo,
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

| Variable            | Uso                                            | Valor predeterminado    |
| ------------------- | ---------------------------------------------- | ----------------------- |
| `PORT`              | Puerto HTTP entre 1 y 65535                    | `3000`                  |
| `FRONTEND_ORIGIN`   | Origen HTTP(S) exacto, sin ruta ni barra final | `http://localhost:4200` |
| `DATABASE_URL`      | Conexión PostgreSQL completa                   | Obligatoria             |
| `POSTGRES_USER`     | Usuario de PostgreSQL                          | Obligatoria             |
| `POSTGRES_PASSWORD` | Contraseña de PostgreSQL                       | Obligatoria             |
| `POSTGRES_DB`       | Base de datos                                  | `helpdesk`              |
| `NODE_ENV`          | `development`, `test` o `production`           | `development`           |

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
| `npm run db:down`             | Detener contenedor conservando el volumen                 |
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
sus propios usuarios y sesiones, sin cambiar los ejemplos. Para incluir la integración local:

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
asigna contraseña a los ejemplos que todavía no la tienen; repetirlo no la
restablece. La [guía de autenticación](docs/auth.md) explica cómo probar el acceso
sin poner contraseñas en argumentos ni mostrar cookies en la terminal.

Prettier comparte las opciones del frontend. No procesa `.env`, dependencias,
artefactos generados, lockfiles ni SQL: las migraciones aplicadas son inmutables
y Prettier no incluye un parser SQL. Los argumentos `_req` de middleware pueden
permanecer sin usar, pues forman parte de la firma de Express.

Consulta la [guía de contribución](../Documentacion/Guia-de-contribucion.md).

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
