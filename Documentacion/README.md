# HelpDesk

HelpDesk es un sistema web interno de mesa de ayuda, desarrollado como proyecto
personal/local. Cada cuenta tiene un único rol: solicitante, agente, supervisor
o administrador. El producto usa autenticación local mediante correo y contraseña.

## Estado funcional · 6-nov-2026

Sprint 1 tiene implementados los núcleos de acceso y administración y Sprint 2
ya tiene creación, listado, búsqueda, filtros, paginación y detalle de tickets
persistidos en PostgreSQL. El código y las pruebas son la fuente de verdad;
las épicas, historias y calendarios describen también trabajo futuro.

- Autenticación con Argon2id, cookie HttpOnly y sesiones en el servidor, bloqueo
  por intentos, expiración, cambio de contraseña y cambio obligatorio tras una
  contraseña temporal.
- Administración de usuarios y categorías; cuentas temporales con vencimiento.
  La contraseña temporal se muestra una vez y se entrega por otro medio.
- Recuperación asistida: respuesta pública genérica y aviso SMTP a administración.
  Mailpit sirve para desarrollo y Brevo es configurable para correo real.
- Tickets reales: todos los roles pueden crear para sí mismos; nacen `creado`,
  sin agente. Referencia pública `TK-XXXXXX`, mínimo seis dígitos; si el número
  supera 999999 se conserva completo, por ejemplo `TK-1000001`.
- Auditoría de operaciones de usuarios, categorías, recuperación elegible y alta
  de tickets. No equivale a un historial de estados ni a toda la futura EP-10.
- POC independiente de Telegram con sesiones en memoria y pruebas sin red.
  No está vinculada a usuarios o tickets reales ni envía notificaciones del caso.

No hay asignación manual, transiciones de estado, conversación integrada,
comentarios, notas internas, adjuntos, prioridad, SLA, base de conocimiento ni
reportes reales. `/reportes` es un marcador. Los otros cinco estados aparecen
en el catálogo, las insignias, filtros y datos del seed, pero no son editables.

## Permisos implementados

Todas las operaciones protegidas exigen sesión vigente y cambio de contraseña
temporal completado. `/me`, logout y cambio de contraseña siguen permitidos
mientras ese cambio sea obligatorio.

| Acción | Solicitante | Agente | Supervisor | Administrador |
| --- | --- | --- | --- | --- |
| Crear ticket propio | Sí | Sí | Sí | Sí |
| Ver tickets propios | Sí | Sí | Sí | Sí |
| Ver tickets de otros | No; responde 404 en detalle | Sí | Sí | Sí |
| Consultar categorías activas | Sí | Sí | Sí | Sí |
| Consultar categorías inactivas | No | No | No | Sí |
| Administrar usuarios | No | No | No | Sí |
| Administrar categorías | No | No | No | Sí |
| Cambiar la propia contraseña | Sí | Sí | Sí | Sí |

Las guardas y el menú ayudan en la interfaz; la API vuelve a comprobar permisos.
Las cuentas temporales usan estos mismos cuatro roles, sin un quinto rol.

## Organización y documentación

No hay README ni paquete npm en la raíz. Cada proyecto lleva sus instrucciones:

- [Backend y endpoints reales](../backend/README.md).
- [Autenticación y sesiones](../backend/docs/auth.md).
- [Usuarios y categorías](../backend/docs/users-and-categories.md).
- [Correo y recuperación asistida](../backend/docs/email-and-recovery.md).
- [Tickets: API, búsqueda y permisos](../backend/docs/tickets.md).
- [Base de datos, migraciones y diagrama ER](../backend/db/README.md).
- [Frontend y rutas](../frontend/README.md).
- [Diseño y componentes existentes](../frontend/docs/diseno.md).
- [Pantallas de administración](../frontend/docs/pantallas-administracion.md).
- [Pantallas de tickets](../frontend/docs/tickets.md).
- [Guía de contribución y CI](Guia-de-contribucion.md).
- [Decisiones de producto y pendientes](Decisiones-de-producto.md).
- [POC de Telegram y límites](Telegram-prueba-de-concepto.md).
- [Épicas](Requerimientos/Epics.md), [historias](Requerimientos/UserStoryMapping.md)
  y [Sprint Backlog](Planificacion/SprintBacklog.md): alcance objetivo y cobertura
  actual separados. Los cuestionarios de `Requerimientos/` son plantillas de
  análisis, no contratos de la API ni evidencia de funcionalidades entregadas.
- [Hoja de ruta](docs/index.html) y [bitácora navegable](pagina%20Epicas%20y%20HU/index.html):
  vistas documentales. Sus planes, fechas y estimaciones no acreditan despliegue,
  disponibilidad del equipo ni aceptación de historias completas.

Para levantar el proyecto usa las instrucciones de backend/frontend. Los comandos
npm se ejecutan en su carpeta; no existe un `npm start` en la raíz.
