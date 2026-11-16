# HelpDesk · Frontend

Sprint 1 y núcleo de tickets del Sprint 2 con Angular 22.2, Tailwind CSS 4, TypeScript 6 y Vitest.
Incluye diseño semántico, acceso local, sesiones, recuperación asistida, administración de usuarios/categorías y creación, listado y detalle de tickets.

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
Consulta la [guía de diseño y tokens](docs/diseno.md) y los
[flujos de administración](docs/pantallas-administracion.md).

El backend debe tener sus migraciones aplicadas y estar ejecutándose según
[su README](../backend/README.md). En otra terminal, desde `backend/`:

```bash
npm run db:up
npm run db:migrate
npm run db:seed:dev
npm run dev
```

Usa una cuenta de ejemplo del seed o una creada por el administrador.
La contraseña de desarrollo se gestiona en el backend; no está incrustada en
el frontend. HelpDesk utiliza autenticación local mediante correo y contraseña.
Si el ejecutor informa un checksum distinto, restaura la migración original
antes de continuar; no edites migraciones aplicadas para saltar la comprobación.

`src/environments/environment.ts` define `apiBaseUrl: '/api'`.
`npm start` usa `proxy.conf.json` para enviar `/api/**` a `http://localhost:3000`.
El navegador conserva el origen `http://localhost:4200` y añade el encabezado
Origin en las escrituras; JavaScript no intenta modificar ese encabezado.
En producción Express sirve el build Angular y `/api` desde el mismo origen
HTTPS de Render; el frontend conserva la base relativa `/api`. El proxy de Angular se usa únicamente en desarrollo.

## Rutas y sesión

- `/iniciar-sesion`: acceso mediante correo y contraseña.
- `/cambiar-contrasena`: cambio voluntario u obligatorio por contraseña temporal.
- `/recuperar-contrasena`: solicita ayuda con aviso administrativo, sin restablecimiento automático.
- `/tickets`: listado real paginado, búsqueda, filtros y creación.
  Muestra referencias `TK-XXXXXX` recibidas de la API, mínimo seis dígitos.
- `/tickets/:id`: detalle, asignación, prioridad, acciones de estado y actividad con notas internas autorizadas.
  El propietario puede abrir Telegram del agente asignado en tickets no terminales.
- `/categorias` y `/usuarios`: administración real, disponible solo para el administrador.
- `/reportes`: [reportes operativos reales](docs/reportes.md) para supervisor y administrador, con rangos locales, KPIs, distribuciones, tendencia y carga por agente, con exportación CSV del contexto aplicado.
- `/sin-permiso` y página 404: explican por qué no se puede acceder.

Al arrancar se consulta `/api/auth/me` antes de resolver rutas. Así, refrescar
conserva una sesión válida. AuthService mantiene el perfil únicamente en
memoria mediante signals. No usa localStorage, sessionStorage ni cookies
legibles desde JavaScript. La cookie HttpOnly pertenece al servidor.

Las peticiones a la API incluyen credenciales. Las escrituras llevan JSON,
incluso logout con `{}`. La creación de tickets usa FormData para una imagen opcional;
el navegador fija el Content-Type multipart y su boundary. Ante una sesión rechazada se vuelve a login con una
ruta interna de retorno; una contraseña temporal obliga al cambio, sin menú.
Un 401 `INVALID_CREDENTIALS` al cambiar contraseña se muestra en el formulario:
indica contraseña actual incorrecta y no invalida una sesión todavía válida.
El 401 inicial de `/me` sin cookie se trata como visitante, sin anunciar una
sesión vencida que quizá nunca existió. La restauración tiene un límite de 8 segundos.

Las guardas y la navegación por rol mejoran la experiencia. La autorización
real sigue en el backend. La [guía de tickets](docs/tickets.md) describe creación,
listado, detalle, asignación, transiciones y actividad persistidos. No hay recuperación automática por enlace.

## Recuperación asistida

La pantalla pide un correo y llama a `POST /api/auth/recovery-request`. Muestra
una confirmación genérica, sin indicar existencia o estado de la
cuenta. El servidor avisa a administración únicamente para cuentas
activas y no vencidas. La solicitud no cambia contraseña ni sesiones y tampoco
envía contraseñas por correo. Administración comprueba la identidad antes del
restablecimiento existente y entrega la clave temporal por otro medio.

El formulario recorta el correo, impide doble envío, limpia el campo al aceptar
y no guarda el correo en URL, almacenamiento ni consola. Un exceso muestra el
mensaje genérico de límite; los fallos de red usan el tratamiento habitual.

Para comprobar los avisos locales, desde `backend/` ejecuta `npm run mail:up`
y abre http://127.0.0.1:8025. Consulta la [guía de correo y recuperación](../backend/docs/email-and-recovery.md)
para Mailpit, Brevo y sus limitaciones. El `202` acepta la solicitud y no asegura
entrega: todavía no hay cola persistente ni reintentos durables.

## Usuarios y categorías

Los usuarios tienen filtros compartibles mediante la URL, búsqueda con espera de
300 ms y paginación. Altas y acciones sensibles usan diálogos y confirmaciones.
Las cuentas temporales mantienen el vencimiento obligatorio
cuando lo exige la API. Los controles de la fila propia explican las restricciones.

La contraseña temporal se muestra una vez tras alta o restablecimiento,
con copia explícita y confirmación de entrega. Al terminar se retira de la vista
y se eliminan sus referencias; nunca se guarda en rutas, almacenamiento ni logs.
Las categorías pueden crearse, editarse, desactivarse y reactivarse sin borrado.
Los registros existentes conservan sus referencias.

La guía `/guia-ui` permite probar controles, tablas, menús, diálogos y avisos sin
sesión. Los ensayos con contraseña de demostración generan el valor en el navegador.

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
errores, guardas, formularios, componentes, navegación por rol, búsqueda y filtros de tickets en servidor
y administración (parámetros, paginación, confirmaciones y clave de una sola visualización).
`npm test` termina después de una ejecución. El protector de tokens prueba
archivos temporales con colores inválidos y verifica que falle con ruta y línea.

La compilación predeterminada es producción y queda en `dist/HelpDesk/browser/`.
Producción reemplaza el archivo de rutas de desarrollo por uno vacío, excluyendo
la guía y su componente del bundle. `verify:production` comprueba que no estén
presentes. Para desarrollo continuo también existe `npm run watch`.

Se conservan las versiones de Angular, TypeScript y Tailwind del proyecto.
Figtree se sirve localmente desde npm. Los íconos son SVG propios definidos en `shared/ui/icono.ts`.
Node debe ser >=22.23.1; `.nvmrc` fija 22.23.1. Con nvm usa `nvm install` y `nvm use`.

Para revisar visualmente: compara acceso y tickets con el PDF; prueba Tab y
Escape, foco visible, errores de formulario, filtro y búsqueda; comprueba la
navegación de cada rol y el ancho de 1024 px. Por debajo de ese ancho la
navegación se colapsa y Tickets muestra lista o vista previa en una sola columna,
sin desplazamiento horizontal. Reportes apila también las filas de métricas.

Abre `frontend/` como carpeta de VS Code para usar `.vscode/`, o añade ambos
proyectos a un espacio de trabajo. Consulta la [guía de contribución](../Documentacion/Guia-de-contribucion.md)
para el flujo de ramas y revisiones del equipo.

La prioridad operativa (Baja, Media, Alta, Urgente) se muestra en listado/detalle y
se filtra con priority. Nace Media. La cambia el agente asignado, supervisor o
administrador en tickets no terminales, incluido Resuelto. El propietario no gana
ese permiso. No hay cálculo, escalamiento ni SLA. El cambio a Urgente genera avisos según la guía de notificaciones.
Consulta la guía de tickets para el contrato y los controles disponibles.

El administrador puede configurar el @usuario público de Telegram al crear o editar
una cuenta en Usuarios. El contacto directo no utiliza el bot ni requiere su token.
Las notas internas solo están disponibles para agente asignado, supervisor y
administrador; no se editan ni eliminan. Consulta [tickets](docs/tickets.md).

Nuevo ticket admite una imagen opcional JPEG/PNG/WebP, máximo **10 MiB
(10485760 bytes)**, con preview y opción de quitarla antes de crear. Solo se
almacena en PostgreSQL. En el detalle se carga con sesión y puede ampliarse;
no existe subida, reemplazo o borrado posterior. Los ObjectURL se liberan y no
se usa almacenamiento web. Consulta [tickets](docs/tickets.md).
El enlace Telegram incluye un borrador con número y asunto generado por el backend;
el usuario decide si pulsa Enviar. HelpDesk no almacena ni sincroniza esa conversación.

## Notificaciones

La campana del header muestra [notificaciones personales](docs/notificaciones.md)
con contador, panel paginado, lectura individual/todas y navegación al ticket.
Refresca solo el contador cada 30 segundos, al navegar y tras leer; se pausa con
la pestaña oculta y se limpia al salir. Requiere aplicar la migración 0018 en backend.
Los avisos operativos al grupo Telegram se configuran exclusivamente en la API;
no sustituyen el deep-link personal ni envían notas o seguimiento.

Tickets usa lista y vista previa desde 1024 px; en móvil alterna entre ambas
sin perder filtros ni paginación. Usuarios y Categorías usan filas continuas
con divisores, apiladas bajo 1280 px sin ocultar datos ni crear tarjetas por registro. Reportes apila sus métricas y filas
en móvil, sin desplazamiento lateral. Estados y prioridades son texto semántico, las acciones
de administración son iconos accesibles y el cierre de sesión pide confirmación.
Consulta los patrones en [diseño](docs/diseno.md) y `/guia-ui` en desarrollo.

## Estado v1

Consulta [el informe de cierre](../docs/project-status.md) para alcance, permisos,
verificaciones y límites. `/reportes` permite descargar CSV con filtros aplicados,
fechas UTC y protección contra fórmulas; [detalle](docs/reportes.md#exportar-csv).
Las rutas reales de acceso son `/iniciar-sesion` y `/cambiar-contrasena`.

## Build integrado para Render

Desde la raíz: npm run build:production instala con los dos lockfiles, compila y
verifica Angular y compila el backend. npm run start:production arranca únicamente
Express, que sirve `frontend/dist/HelpDesk/browser/`; nunca ng serve. La ruta está
fijada en angular.json. [Configuración y variables](../docs/deployment-render-supabase.md).
Ningún secreto de Supabase/SMTP/Telegram se incorpora al frontend.
