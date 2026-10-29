# Guía de contribución a HelpDesk

## Flujo de trabajo

`main` debe permanecer estable y protegida. Trabajamos en ramas cortas, cada
una con un cambio concreto y un pull request hacia `main`:

- `feature/HU-XX-XX-descripcion` para una historia de usuario.
- `fix/descripcion` para corregir un error.
- `chore/descripcion` para herramientas, configuración y tareas del Sprint 0.

Ejemplo para iniciar una tarea:

```bash
git switch main
git pull --ff-only
git switch -c feature/HU-01-01-descripcion
```

Ejecuta los chequeos, revisa el diff y sube tu rama. Completa la plantilla del PR
con el resultado esperado, la historia relacionada y las pruebas realizadas.
Las tareas de cimientos pueden referenciar `S0-XX` en lugar de una HU.

Cada PR requiere CI en verde y la aprobación de al menos otra persona.
Resuelve los comentarios de revisión antes de fusionar. Usa **Squash and merge**
para dejar un commit por PR y elimina la rama al terminar. No hagas pushes
directos ni force pushes a `main`.

## Mensajes de commit

Usa `tipo: descripción breve`, con un scope opcional: `tipo(scope): descripción`.
Tipos habituales: `feat`, `fix`, `chore`, `test` y `docs`.

```text
feat(tickets): agregar filtro de estado (HU-02-03)
fix(api): corregir el origen permitido de CORS
chore(ci): agregar chequeos de calidad (S0-05)
```

El título final del squash debe seguir la misma convención.

## Node y dependencias

Cada proyecto contiene `.nvmrc` con Node `22.23.1` y exige Node `>=22.23.1`.
Si ya tienes nvm, ejecuta `nvm install` y `nvm use` dentro de cada carpeta.
Con otro gestor, selecciona esa misma versión. Usa npm y conserva los lockfiles:
para reproducir una instalación ejecuta `npm ci`.

## Chequeos antes de subir cambios

Desde la raíz, en una terminal para el frontend:

```bash
cd frontend
npm ci
npm run format
npm run check
```

Y otra terminal para el backend:

```bash
cd backend
npm ci
npm run db:up
npm run db:migrate
npm run format
set -a
source .env
set +a
npm run check
```

El `.env` es local: créalo desde `.env.example` y completa `DATABASE_URL`
siguiendo `backend/db/README.md`. Nunca lo agregues a Git. Los comandos `source`
anteriores asumen el formato bash del ejemplo; exportan las variables para que
Vitest pueda ejecutar la integración contra PostgreSQL real.

En ambos proyectos, `check` ejecuta en orden **lint → format:check → typecheck
→ test → build** y se detiene ante el primer error. `format` escribe cambios;
`format:check` solo verifica. Revisa siempre el diff después de formatear.

Comandos individuales disponibles en cada carpeta:

```bash
npm run lint
npm run lint:fix
npm run format:check
npm run typecheck
npm test
npm run test:watch
npm run build
```

`npm test` termina tras una ejecución. En frontend verifica los casos correcto,
de error y reintento del estado de la API. En backend usa Vitest y Supertest;
las pruebas unitarias no requieren PostgreSQL. La integración de `/api/health/db`
se omite con un mensaje **SKIP** si `DATABASE_URL` no está exportada. Si está
definida y la base falla, la prueba falla; no se omite por un error de conexión.

Las pruebas anteriores de herramientas y arranque siguen disponibles en
`backend/` con `npm run test:db` y `npm run test:server`. La primera crea y elimina
una base temporal, requiere `NODE_ENV=development` y permiso `CREATEDB`.
Estas pruebas adicionales no forman parte del `check` de Vitest.

Las migraciones aplicadas son inmutables: no se formatean ni se editan. Usa
`npm run db:new -- descripcion` y revisa la guía de base de datos para cambiarlas.

## CI en GitHub

`.github/workflows/ci.yml` se ejecuta en pushes a `main` y PR hacia `main`.
Los jobs `frontend` y `backend` se ejecutan en paralelo, instalan con `npm ci`
y ejecutan `npm run check`. El backend levanta un servicio PostgreSQL 17 con
credenciales desechables, aplica migraciones y ejecuta la integración real.
El workflow no requiere secretos ni ejecuta `db:reset` contra bases compartidas.

## Ajustes manuales del repositorio en GitHub

Una persona administradora debe configurar lo siguiente:

1. En **Settings → Rules → Rulesets**, crea una regla para `main` y actívala
   (o usa **Branches → Branch protection rules**, según la interfaz disponible).
2. Exige un pull request antes de fusionar y al menos **una aprobación** de
   otra persona. Exige resolver las conversaciones de revisión y descarta las
   aprobaciones anteriores cuando se agreguen cambios nuevos.
3. Exige que pasen los status checks **frontend** y **backend**. Pueden aparecer
   como `CI / frontend` y `CI / backend` en la interfaz. Primero ejecuta el
   workflow una vez para que GitHub permita seleccionarlos.
4. Bloquea pushes directos, force pushes y eliminación de `main`. No configures
   actores con bypass; aplica las reglas también a administradores cuando la
   configuración y el plan del repositorio lo permitan.
5. En **Settings → General → Pull Requests**, habilita **Allow squash merging**
   y deshabilita merge commits y rebase si quieres imponer squash. Activa la
   eliminación automática de ramas después de fusionar.
6. Verifica que GitHub Actions esté habilitado y permita `actions/checkout` y
   `actions/setup-node`. El workflow solicita solo `contents: read`.

Esta guía y el workflow no activan automáticamente la protección de `main`;
esos ajustes se realizan en GitHub con permisos de administración.
