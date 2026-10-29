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
npx ng version
npm run build
npx tsc --project tsconfig.spec.json --noEmit
npm test -- --watch=false
curl -i http://localhost:4200/api/health
```

La compilación queda en `dist/HelpDesk/browser/`. Se mantienen las versiones y
resoluciones del lockfile original; su único cambio es el nombre del proyecto.

## Editor

Abre `frontend/` como carpeta de VS Code para cargar su configuración `.vscode/`.
También puedes agregar `frontend/` y `backend/` a un espacio de trabajo de VS Code.
