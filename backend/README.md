# HelpDesk · API

Base del Sprint 0: Express 5, TypeScript 6, CORS, Helmet y PostgreSQL 17.
El esquema de usuarios, roles, categorías y tickets se gestiona con migraciones SQL.
Consulta [la guía de base de datos y su diagrama ER](db/README.md).
No hay autenticación ni endpoints de negocio.

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
DATABASE_URL=postgresql://helpdesk:helpdesk_local_dev@localhost:5432/helpdesk
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
La API escucha solo en `127.0.0.1`; CORS permite el origen exacto configurado,
sin comodines.

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

| Comando                    | Acción                                                 |
| -------------------------- | ------------------------------------------------------ |
| `npm run dev`              | API con recarga mediante `tsx watch`                   |
| `npm run typecheck`        | Validación TypeScript sin emitir archivos              |
| `npm run build`            | Compilar a `dist/`                                     |
| `npm start`                | Ejecutar `dist/server.js` después de compilar          |
| `npm run db:up`            | Crear/iniciar PostgreSQL y esperar al healthcheck      |
| `npm run db:down`          | Detener contenedor conservando el volumen              |
| `npm run db:logs`          | Seguir los registros de PostgreSQL                     |
| `npm run db:migrate`       | Aplicar migraciones pendientes                         |
| `npm run db:status`        | Listar migraciones aplicadas y pendientes              |
| `npm run db:new -- nombre` | Crear la siguiente migración SQL                       |
| `npm run db:reset`         | Recrear public y migrar, solo en desarrollo local      |
| `npm run db:seed:dev`      | Cargar ejemplos idempotentes, solo en desarrollo local |
| `npm run test:db`          | Probar las herramientas en una base temporal aislada   |
| `npm run test:server`      | Verificar el manejo de un puerto ocupado               |
| `npm run lint`             | ESLint, sin avisos permitidos                          |
| `npm run lint:fix`         | Corregir automáticamente lo que permita ESLint         |
| `npm run format`           | Aplicar Prettier                                       |
| `npm run format:check`     | Verificar formato sin escribir                         |
| `npm test`                 | Vitest y Supertest, una sola ejecución                 |
| `npm run test:watch`       | Vitest en modo watch                                   |
| `npm run check`            | Lint, formato, tipos, pruebas y build en orden         |

`SIGINT` y `SIGTERM` cierran el servidor HTTP y el pool de conexiones.
En producción, ejecuta con `NODE_ENV=production npm start` para omitir
stack traces en las respuestas de error.

`check` se detiene ante el primer fallo. `typecheck` valida también los tests
y la configuración de Vitest; `build` emite solo el código de `src/`.
Se usa Node >=22.23.1; `.nvmrc` fija 22.23.1 para el equipo y CI.
Con nvm: `nvm install` y `nvm use` dentro de esta carpeta.

Las pruebas unitarias de `npm test` usan configuraciones aisladas y no necesitan
PostgreSQL. La integración de `/api/health/db` usa la base real y solo se ejecuta
si `DATABASE_URL` está exportada. Si falta, se informa un SKIP; no se carga el
`.env` automáticamente para decidirlo. Para incluir la integración local:

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
