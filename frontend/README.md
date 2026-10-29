# HelpDesk · Frontend

Aplicación interna con Angular 22.2, Tailwind CSS 4, TypeScript 6 y Vitest.
Sprint 0: pantalla de disponibilidad de la API, sin funcionalidad de negocio.

## Desarrollo

Desde la raíz del repositorio:

```bash
cd frontend
npm ci
npm start
```

Abre http://localhost:4200. Inicia también el backend según `../backend/README.md`.
La pantalla consulta `GET /api/health` y permite reintentar ante errores.
Este estado indica disponibilidad de la API; la base de datos tiene su propia
comprobación en `GET /api/health/db`.

`src/environments/environment.ts` define `apiBaseUrl: '/api'`.
`npm start` carga `proxy.conf.json` para redirigir `/api/**` a
`http://localhost:3000`. En producción, configura el servidor web para dirigir
`/api` al backend; el proxy de Angular solo se usa en desarrollo.

Tailwind está conectado mediante `.postcssrc.json` y `@import 'tailwindcss'`
en `src/styles.css`. La pantalla usa clases de utilidad para colores,
espaciado y tipografía.

## Verificación

```bash
npm run lint
npm run lint:fix
npm run format
npm run format:check
npm run typecheck
npm test
npm run test:watch
npm run check
npx ng version
curl -i http://localhost:4200/api/health
```

`check` ejecuta lint, format:check, typecheck, test y build en ese orden y se
detiene ante el primer fallo. `npm test` hace una sola ejecución; usa
`test:watch` durante el desarrollo. `format` escribe cambios y `format:check`
solo los verifica. ESLint usa la configuración flat generada por angular-eslint 22,
incluidos los chequeos de accesibilidad de las plantillas.

La compilación queda en `dist/HelpDesk/browser/`. Se conservan las versiones de
Angular, TypeScript y Tailwind del lockfile original. Node debe ser >=22.23.1;
`.nvmrc` fija 22.23.1 para el equipo y CI. Si usas nvm: `nvm install` y `nvm use`.

Consulta la [guía de contribución](../Documentacion/Guia-de-contribucion.md) para
las ramas, pull requests y comprobaciones del equipo.

## Editor

Abre `frontend/` como carpeta de VS Code para cargar su configuración `.vscode/`.
También puedes agregar `frontend/` y `backend/` a un espacio de trabajo de VS Code.
