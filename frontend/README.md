# HelpDesk · Frontend

Base del Sprint 1 con Angular 22.2, Tailwind CSS 4, TypeScript 6 y Vitest.
Incluye diseño semántico, acceso local, sesiones y un esqueleto de navegación.

## Desarrollo

Desde la raíz del repositorio:

```bash
cd frontend
npm ci
npm start
```

Abre http://localhost:4200. Para la galería de componentes, abre
http://localhost:4200/guia-ui; solo se registra durante el desarrollo.
La referencia visual está en `docs/referencia/HelpDesk-diseno.pdf`.
Consulta la [guía de diseño y tokens](docs/diseno.md).

El backend debe tener sus migraciones aplicadas y estar ejecutándose según
[su README](../backend/README.md). En otra terminal, desde `backend/`:

```bash
npm run db:up
npm run db:migrate
npm run db:seed:dev
npm run dev
```

Usa una cuenta local de ejemplo del seed o una creada por el administrador.
La contraseña de desarrollo se gestiona en el backend; no está incrustada en
el frontend. Las cuentas de directorio todavía no admiten inicio de sesión.
Si el ejecutor informa un checksum distinto, restaura la migración original
antes de continuar; no edites migraciones aplicadas para saltar la comprobación.

`src/environments/environment.ts` define `apiBaseUrl: '/api'`.
`npm start` usa `proxy.conf.json` para enviar `/api/**` a `http://localhost:3000`.
El navegador conserva el origen `http://localhost:4200` y añade el encabezado
Origin en las escrituras; JavaScript no intenta modificar ese encabezado.
En producción dirige `/api` al backend mediante el servidor web y sirve la
aplicación por HTTPS. El proxy de Angular se usa únicamente en desarrollo.

## Rutas y sesión

- `/iniciar-sesion`: acceso mediante correo y contraseña.
- `/cambiar-contrasena`: cambio voluntario u obligatorio por contraseña temporal.
- `/recuperar-contrasena`: indica que hay que contactar al administrador.
- `/tickets`: seis ejemplos locales del PDF, buscador y filtros por estado.
- `/categorias` y `/usuarios`: marcadores disponibles para el administrador.
- `/reportes`: marcador para supervisor y administrador.
- `/sin-permiso` y página 404: explican por qué no se puede acceder.

Al arrancar se consulta `/api/auth/me` antes de resolver rutas. Así, refrescar
conserva una sesión válida. AuthService mantiene el perfil únicamente en
memoria mediante signals. No usa localStorage, sessionStorage ni cookies
legibles desde JavaScript. La cookie HttpOnly pertenece al servidor.

Las peticiones a la API incluyen credenciales. Las escrituras llevan JSON,
incluso logout con `{}`. Ante una sesión rechazada se vuelve a login con una
ruta interna de retorno; una contraseña temporal obliga al cambio, sin menú.
Un 401 `INVALID_CREDENTIALS` al cambiar contraseña se muestra en el formulario:
indica contraseña actual incorrecta y no invalida una sesión todavía válida.
El 401 inicial de `/me` sin cookie se trata como visitante, sin anunciar una
sesión vencida que quizá nunca existió. La restauración tiene un límite de 8 segundos.

Las guardas y la navegación por rol mejoran la experiencia. La autorización
real sigue en el backend. No hay todavía administración visual, gestión real
de tickets, directorio corporativo ni recuperación por correo. Nuevo ticket
muestra un aviso; no crea registros ni llama a una API de tickets.

## Calidad y producción

```bash
npm run lint
npm run lint:fix
npm run lint:tokens
npm run test:tokens
npm run format
npm run format:check
npm run typecheck
npm test
npm run test:watch
npm run check
npm run build
npm run verify:production
```

`check` ejecuta ESLint, protección de tokens, formato, tipos, pruebas del
protector, Vitest, build y verificación de producción; se detiene ante fallos.
El workflow existente ejecuta `npm run check`, por lo que cubre también
`lint:tokens`. No necesitas una instalación global ni ejecutar pruebas con backend.

Vitest utiliza HttpTestingController y el enrutador de pruebas. Cubre sesión,
errores, guardas, formularios, componentes, navegación por rol y filtros locales.
`npm test` termina después de una ejecución. El protector de tokens prueba
archivos temporales con colores inválidos y verifica que falle con ruta y línea.

La compilación predeterminada es producción y queda en `dist/HelpDesk/browser/`.
Producción reemplaza el archivo de rutas de desarrollo por uno vacío, excluyendo
la guía y su componente del bundle. `verify:production` comprueba que no estén
presentes. Para desarrollo continuo también existe `npm run watch`.

Se conservan las versiones de Angular, TypeScript y Tailwind del proyecto.
Figtree se sirve localmente desde npm. Los íconos son SVG propios porque el
paquete Lucide consultado no declara compatibilidad con Angular 22.
Node debe ser >=22.23.1; `.nvmrc` fija 22.23.1. Con nvm usa `nvm install` y `nvm use`.

Para revisar visualmente: compara acceso y tickets con el PDF; prueba Tab y
Escape, foco visible, errores de formulario, filtro y búsqueda; comprueba la
navegación de cada rol y el ancho de 1024 px. Por debajo de ese ancho la
navegación se colapsa y la lista se desplaza horizontalmente.

Abre `frontend/` como carpeta de VS Code para usar `.vscode/`, o añade ambos
proyectos a un espacio de trabajo. Consulta la [guía de contribución](../Documentacion/Guia-de-contribucion.md)
para el flujo de ramas y revisiones del equipo.
