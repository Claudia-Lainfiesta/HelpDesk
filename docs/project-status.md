# Estado de HelpDesk v1

Cierre técnico del 16 de noviembre de 2026. Proyecto personal/local, no despliegue
de producción. El código, las migraciones y las pruebas definen el comportamiento;
los mapas de historias conservan criterios de planificación adicionales.

## Implementado

- Angular 22 standalone, signals, formularios reactivos, carga diferida; Express 5,
  TypeScript estricto y PostgreSQL 17 con SQL parametrizado y migraciones verificadas.
- Autenticación local Argon2id, sesiones de servidor con cookie HttpOnly, Origin
  comprobado en escrituras, bloqueo y expiración; cambio obligatorio de contraseña
  temporal y recuperación asistida por administración mediante SMTP (Mailpit/Brevo).
- Usuarios y categorías administrados solo por administrador; cuentas temporales
  con vencimiento distinto de una contraseña temporal. Categorías sin borrado.
- Tickets públicos TK- con mínimo seis dígitos, creación propia, búsqueda/filtros,
  paginación, master-detail desde 1024 px y presentación apilada móvil.
- Asignación, nueve transiciones, prioridad manual de cuatro valores (Media inicial),
  actividad estructurada y auditoría transaccional.
- Notas internas inmutables: solo soporte autorizado; imagen inicial opcional única,
  JPEG/PNG/WebP, máximo 10 MiB exactos, firmas/MIME/extensión y almacenamiento BYTEA.
- Telegram directo al agente con borrador construido en backend; bot separado de
  avisos generales, posterior al commit, con timeout y errores saneados.
- Notificaciones personales persistentes, lectura individual/global, campana y
  contador cada 30 segundos mientras hay sesión y pestaña visible.
- Reportes operativos PostgreSQL y CSV con filtros comunes, acceso supervisor/admin.
- Sistema visual semántico: estados/prioridades como texto, filas con divisores,
  acciones iconográficas accesibles, confirmaciones y vistas adaptadas.

## Permisos finales

Cada usuario tiene exactamente un rol. Propiedad y asignación se evalúan además
del rol; una cuenta de agente propietaria no adquiere permisos de soporte por ello.

| Acción                            | Solicitante                 | Agente                   | Supervisor          | Administrador       |
| --------------------------------- | --------------------------- | ------------------------ | ------------------- | ------------------- |
| Crear ticket propio               | Sí                          | Sí                       | Sí                  | Sí                  |
| Leer ticket/imagen                | Solo propios; ajenos 404    | Todos                    | Todos               | Todos               |
| Asignar                           | No                          | Solo a sí mismo si libre | Sí                  | Sí                  |
| Reasignar/desasignar              | No                          | No                       | Sí                  | Sí                  |
| Iniciar/esperar/reanudar/resolver | No                          | Solo asignado            | Sí, requiere agente | Sí, requiere agente |
| Cancelar en Creado/En espera      | Solo propio                 | Solo propio              | Sí                  | Sí                  |
| Cerrar/reabrir Resuelto           | Solo propio                 | Solo propio              | Sí                  | Sí                  |
| Cambiar prioridad no terminal     | No                          | Solo asignado            | Sí                  | Sí                  |
| Leer notas (también terminales)   | No                          | Solo asignado actual     | Sí                  | Sí                  |
| Agregar nota no terminal          | No                          | Solo asignado            | Sí                  | Sí                  |
| Contacto Telegram no terminal     | Propio, con agente distinto | Igual                    | Igual               | Igual               |
| Administrar usuarios/categorías   | No                          | No                       | No                  | Sí                  |
| Reportes/opciones/CSV             | No                          | No                       | Sí                  | Sí                  |
| Notificaciones                    | Solo propias                | Solo propias             | Solo propias        | Solo propias        |

La API es la autoridad, con 403 para recursos administrativos no permitidos y 404
para ticket ajeno al solicitante o notificación de otro usuario. Contraseña temporal
pendiente bloquea las funciones protegidas excepto perfil, cambio y logout.

## Estados, trazabilidad y avisos

Transiciones: Creado → En proceso/Cancelado; En proceso → En espera/Resuelto;
En espera → En proceso/Resuelto/Cancelado; Resuelto → En proceso/Cerrado.
Cerrado y Cancelado son terminales. Reabrir elimina resolved_at vigente; resolver
establece uno nuevo. Prioridad y notas no cambian estado ni asignación.

La mutación, actividad, auditoría y notificación web se confirman o revierten juntas.
La web avisa al nuevo agente al asignar/reasignar; al propietario al iniciar atención,
esperar y resolver; al agente al reabrir/cerrar y cambiar a Urgente. No se crean
avisos al propio actor. No hay avisos por notas ni lectura.

Telegram grupo solo publica creación, asignación/reasignación y Urgente. No publica
asunto, solicitante, correo, notas, imagen ni seguimiento. Los fallos externos no
revierten tickets. La aplicación no guarda conversaciones; el contacto directo no
crea actividad ni envía mensajes automáticamente. [Telegram](../Documentacion/Telegram.md).

## Reportes y CSV

Rango local inclusivo de 30 días por defecto; rápidos 7/30/90, personalizado máximo
365 días. Cada volumen usa su fecha de evento; pendientes actuales no dependen del
rango. Estado/prioridad/categoría y CSV usan tickets creados en rango. Agente se
interpreta como asignación actual; resolución usa resolved_at vigente.

CSV de trece columnas: Ticket, Asunto, Categoría, Estado, Prioridad, Solicitante,
Agente asignado, Fecha de creación, Fecha de resolución, Fecha de cierre,
Fecha de cancelación, Tiempo de resolución, Tiempo de cierre. Fechas UTC explícitas,
BOM UTF-8, coma, comillas escapadas y protección de fórmulas con apóstrofo incluso
tras espacios/controles. Sin descripción, notas, correos, datos Telegram ni adjuntos.
Se exportan los filtros aplicados, no el borrador del formulario. Sin datos: encabezado.
[API](../backend/docs/reports.md), [pantalla](../frontend/docs/reportes.md).

## Desarrollo reproducible

La raíz incorpora README y scripts de build/start de producción; el desarrollo y
los checks se conservan en backend/ y frontend/.
Desde backend: npm ci, configurar .env privado según .env.example,
npm run db:up, npm run db:migrate, npm run db:seed:dev, npm run dev.
Desde frontend: npm ci y npm start. Rutas reales de acceso /iniciar-sesion y
/cambiar-contrasena; /login y /cambiar-password no son rutas del producto.
El seed es idempotente, solo local/desarrollo, escribe SQL y no envía SMTP/Telegram;
usa contraseña aleatoria privada o SEED_DEV_PASSWORD, nunca credenciales del código.
No reescribir migraciones aplicadas ni ejecutar db:reset sobre datos que se desean conservar.

## Fuera de alcance v1

SLA, prioridad automática, dashboard separado, múltiples adjuntos o posteriores,
chat interno/comentarios públicos, WebSockets/SSE/push, Excel/PDF, colas/outbox,
reintentos persistentes y despliegue productivo. No hay nuevos roles ni estados.

## Limitaciones conocidas

- Avisos Telegram y correo son best effort sin recuperación persistente tras caída;
  Telegram puede añadir hasta cuatro segundos al tiempo de respuesta tras el commit.
- No se reconstruyen responsable histórico ni primera resolución en reportes; cada
  endpoint tiene su snapshot, pero peticiones paralelas pueden observar cambios distintos.
- CSV se genera en memoria para el rango filtrado; su coste crece con ese volumen.
- La inactividad de sesión mide peticiones autenticadas, no interacción humana; el
  polling de una pestaña visible la mantiene activa hasta el límite absoluto (8 horas
  por defecto). Cambiar esa política requiere una decisión funcional posterior.
- No hay limpieza automática de notificaciones, sesiones vencidas se purgan con el
  comando documentado; no hay preferencias de notificación.
- El username Telegram lo configura administración y debe comprobarlo con el empleado;
  no es una vinculación verificada mediante bot. Apertura y borrador en clientes reales
  y entrega externa requieren validación con cuentas/servicios reales.
- La auditoría se persiste; no existe pantalla/API general de consulta de auditoría
  ni sistema de respaldos/restauración dentro de la aplicación.

## Auditoría y correcciones del cierre

Se contrastaron rutas/guardas y permisos frontend con policy.ts y las validaciones
backend. No se modificaron roles, estados, transiciones, propiedad, asignación,
visibilidad de notas, prioridades ni reglas de notificación. Las suites prueban
404 para ticket ajeno, 403 administrativo, permisos combinados, concurrencia y
rollback de actividad/auditoría/notificaciones/imagen.

Correcciones:

- Errores JSON recibidos como Blob (imagen y CSV) ahora mantienen el código API,
  incluyendo PASSWORD_CHANGE_REQUIRED y su redirección. Mensajes técnicos no se
  muestran al usuario y el fallo de exportación no borra los reportes cargados.
- Se retiraron runner, relay, scripts telegram:dev/telegram:check y pruebas exclusivas
  de la POC antigua, que ya no participaba en el producto. Se quitaron grammY y
  abort-controller (ocho paquetes en total con sus transitivas), sin actualizar
  Angular/TypeScript/Tailwind ni cambiar las dos integraciones vigentes.
- Se eliminó TELEGRAM_ALLOWED_USER_IDS del parser/ejemplo/pruebas y se sustituyó
  documentación del experimento por Telegram.md. Las migraciones históricas no se tocaron.
- Se corrigieron resúmenes que aún presentaban notas, prioridad, adjuntos, reportes
  y notificaciones como pendientes, y se separó planificación de implementación.
- Se añadió CSV seguro y la documentación del alcance actual.

La búsqueda de TODO/FIXME/HACK/XXX y placeholders visibles obsoletos no encontró
pendientes en código productivo. Se conservan los atributos placeholder de los
campos, los mocks de pruebas, los escenarios del seed y dummyHash de Argon2id,
que iguala el trabajo de verificación y no es código simulado. Se conserva el único
console.error frontend de fallo de arranque, con mensaje fijo saneado; no hay logs
de depuración en flujos normales. No se eliminaron componentes de la guía reutilizable.

## Verificación del cierre funcional v1 (anterior al despliegue)

| Comprobación                  | Resultado                                                                                                                                                                           |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend npm run check         | Lint, formato, tipos, 429 pruebas en 23 archivos y build correctos; integración PostgreSQL habilitada, sin skips                                                                    |
| Frontend npm run check        | Lint, lint:tokens, formato, tipos, prueba del linter, 309 pruebas en 22 archivos, build y verify:production correctos                                                               |
| Producción frontend           | Guía UI excluida del bundle/rutas; sin advertencias críticas de compilación                                                                                                         |
| Herramientas de base/servidor | npm run test:db: 10 pruebas; npm run test:server: 1 prueba; correctas                                                                                                               |
| Migraciones desde cero        | 19 aplicadas, cero pendientes, sin reescribir SQL histórico ni añadir migraciones para CSV                                                                                          |
| Seed                          | Dos ejecuciones correctas e idempotentes en base desechable; sin envío de correo/Telegram                                                                                           |
| Base del usuario              | Conservada; base y esquemas de prueba eliminados al terminar                                                                                                                        |
| Navegador                     | Brave headless, frontend/API reales temporales y PostgreSQL; cuatro roles, sin llamadas externas                                                                                    |
| Responsive                    | 48 mediciones sin overflow global (incluye acceso): tickets/lista/vista previa/detalle, usuarios, categorías, reportes, login y cambio de contraseña a 360/390/430/768/1024/1440 px |
| Accesibilidad                 | Foco atrapado y restaurado en confirmación, teclado, acciones de al menos 44 px, estados con texto, tablas etiquetadas y controles con nombre                                       |
| Contraste                     | Texto/estados/prioridades/mensajes >= 4,5:1 sobre superficie, superficie suave y fondo; mínimo observado 5,45:1                                                                     |
| Seguridad estática            | Sin archivos .env/contraseñas privadas versionados ni patrones de tokens reales detectados; 28 variables actuales cubiertas por .env.example                                        |
| Colores/emojis                | lint:tokens correcto; sin emojis en código frontend/backend ni colores crudos fuera de tokens                                                                                       |
| Referencias antiguas          | Sin HD- de tickets ni autenticación de directorio activa; referencias históricas solo en migraciones 0008 y 0010                                                                    |

Flujos ejecutados con sesiones y PostgreSQL reales:

1. Propietario crea con PNG; aviso general falso, supervisor asigna y agente recibe
   notificación; Iniciar atención desde UI avisa al solicitante, que abre la campana,
   marca como leída y navega al ticket.
2. Espera, resolución, reapertura, nueva resolución y cierre notifican a sus
   destinatarios y no producen seguimiento en Telegram grupo.
3. Crear/asignar/cambiar a Urgente con Telegram fallido conserva el commit y las
   notificaciones personales. Reasignar cambia acceso a notas históricas.
4. Nota con texto script se persiste y muestra literalmente, sin ejecución ni cambio
   de estado/prioridad. Solicitante y agente no asignado no reciben note_added.
5. Imagen protegida devuelve bytes/headers exactos; solicitante ajeno recibe 404 y
   contenido PDF renombrado JPG se rechaza. Las suites cubren JPEG/PNG/WebP, límites
   exactos, formatos falsos, archivo doble y rollback.
6. CSV real descargado con rango, categoría y agente combinados coincide con la
   cohorte conocida. Tests comprueban roles, fechas inclusivas, inactivos, privacidad,
   encabezados, nombre, UTF-8, comas/comillas/saltos y fórmulas.
7. Confirmaciones de desactivación conservan controles y foco; iconos destructivos
   rojos sin fondo rojo. Filas continuas, estados sin pills y split view conservados.

8. CSV sin datos produce solo encabezados; errores simulados de reportes y CSV
   muestran mensajes saneados, conservan datos y permiten reintentar.
9. Alta administrativa produce contraseña temporal: login exige cambiarla sin
   navegación, guardado permite entrar, refrescar conserva sesión y logout
   confirmado la revoca. Sin tokens/contraseñas en storage ni document.cookie.
   Login también se midió en los seis anchos, sin overflow ni errores de ejecución.

Las pruebas de fallo y los clientes HTTP externos se simularon deliberadamente.
No se afirma entrega en Telegram/Brevo reales ni envío/apertura de un mensaje en
clientes Telegram externos. No hubo commits ni modificación de datos del usuario.

## Documentación revisada

- Backend: README.md, db/README.md, docs/auth.md, users-and-categories.md,
  email-and-recovery.md, tickets.md, notifications.md, reports.md y el README de
  test/fixtures/images. Los contratos ya correctos se conservaron.
- Frontend: README.md y docs/diseno.md, pantallas-administracion.md, tickets.md,
  notificaciones.md y reportes.md; se actualizó CSV y manejo de descargas.
- Documentacion: README.md, Decisiones-de-producto.md, Guia-de-contribucion.md,
  Requerimientos/Epics.md, UserStoryMapping.md, cuestionarios y Descripcion general
  del proyecto.txt, Planificacion/SprintBacklog.md, página de épicas/avances y roadmap.
  Se conservaron historias/estimaciones sin declararlas aceptadas por esta auditoría.
- Nuevo: este documento y Documentacion/Telegram.md. Eliminado:
  Documentacion/Telegram-prueba-de-concepto.md, sustituido por los dos usos reales.
- Binarios: referencia frontend/docs/referencia/HelpDesk-diseno.pdf, logo documental
  y fixtures se conservaron. Son referencia visual/pruebas; no se reconstruyeron
  ni regeneraron arbitrariamente. Los patrones de UI vigentes están en diseno.md.

## Preparación posterior de despliegue

El repositorio incorpora producción en una Web Service Render con Angular servido
por Express y PostgreSQL Supabase mediante Session Pooler/TLS verificado. No se
ha desplegado ni se ha conectado a Supabase desde esta revisión. Se conservan las
decisiones de negocio v1; [guía y pasos](deployment-render-supabase.md).
La preparación posterior pasó 447 pruebas backend y 309 frontend, build raíz
exacto, smoke del servidor compilado y arranque Angular con CSP sin violaciones.
Solo se usó PostgreSQL local desechable; Supabase y Render reales no se han probado.

## Estado recomendado y pendientes

**Listo para uso local con observaciones.** Los controles y flujos comprobados no
requieren comandos de corrección pendientes. Se mantienen las limitaciones
anteriores, especialmente inactividad basada en peticiones, avisos best effort y
métricas por asignación/resolución actuales.

La validación externa pendiente es voluntaria y requiere cuentas reales: configurar
las variables opcionales del grupo y SMTP según las guías, iniciar backend con
npm run dev y frontend con npm start; comprobar entrega al grupo y borrador del
contacto directo sin envío automático. Ningún test de check realiza esos envíos.

## Archivos de esta revisión

### Modificados

- `Documentacion/Decisiones-de-producto.md`
- `Documentacion/Planificacion/SprintBacklog.md`
- `Documentacion/README.md`
- `Documentacion/Requerimientos/Descripcion general del proyecto.txt`
- `Documentacion/Requerimientos/Epics.md`
- `Documentacion/Requerimientos/UserStoryMapping.md`
- `Documentacion/docs/index.html`
- `Documentacion/pagina Epicas y HU/app.js`
- `Documentacion/pagina Epicas y HU/index.html`
- `Documentacion/pagina Epicas y HU/preparation.js`
- `backend/.env.example`
- `backend/README.md`
- `backend/db/README.md`
- `backend/docs/auth.md`
- `backend/docs/notifications.md`
- `backend/docs/reports.md`
- `backend/docs/tickets.md`
- `backend/package-lock.json`
- `backend/package.json`
- `backend/src/config/telegram-env.ts`
- `backend/src/reports/controller.ts`
- `backend/src/reports/repository.ts`
- `backend/src/reports/routes.ts`
- `backend/src/reports/service.ts`
- `backend/src/reports/types.ts`
- `backend/test/integration/auth.test.ts`
- `backend/test/integration/recovery.test.ts`
- `backend/test/integration/reports.test.ts`
- `backend/test/integration/tickets.test.ts`
- `backend/test/integration/users-and-categories.test.ts`
- `backend/test/unit/support-notifications.test.ts`
- `backend/test/unit/telegram-env.test.ts`
- `frontend/README.md`
- `frontend/docs/reportes.md`
- `frontend/src/app/core/auth/sesion.interceptor.spec.ts`
- `frontend/src/app/core/auth/sesion.interceptor.ts`
- `frontend/src/app/core/reportes/reportes-api.spec.ts`
- `frontend/src/app/core/reportes/reportes-api.ts`
- `frontend/src/app/features/reportes/reportes.html`
- `frontend/src/app/features/reportes/reportes.spec.ts`
- `frontend/src/app/features/reportes/reportes.ts`

### Creados

- `Documentacion/Telegram.md`
- `backend/src/reports/csv.ts`
- `backend/test/unit/reports-csv.test.ts`
- `docs/project-status.md`

### Eliminados

- `Documentacion/Telegram-prueba-de-concepto.md`
- `backend/src/integrations/telegram/bot.ts`
- `backend/src/integrations/telegram/relay/relay.ts`
- `backend/src/integrations/telegram/relay/session-manager.ts`
- `backend/src/integrations/telegram/runtime.ts`
- `backend/src/telegram-check.ts`
- `backend/src/telegram-poc.ts`
- `backend/test/unit/telegram-bot.test.ts`
- `backend/test/unit/telegram-fixtures.ts`
- `backend/test/unit/telegram-relay.test.ts`
- `backend/test/unit/telegram-runtime.test.ts`
- `backend/test/unit/telegram-session.test.ts`
