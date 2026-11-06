# Tickets

El número público es `TK-XXXXXX`, por ejemplo `TK-000123`, mínimo seis dígitos.
Al superar 999999 se muestra el número completo. La interfaz usa `number` de la
API, sin formatearlo de nuevo. El ID interno se mantiene en `/tickets/:id`.

`/tickets` consume exclusivamente la API. El backend determina visibilidad:
solicitante ve sus tickets; agente, supervisor y administrador ven todos.
Todos pueden crear para sí mismos y necesitan cambiar antes una contraseña
temporal. Las guardas conservan la sesión y el backend verifica cada petición.

La búsqueda espera 300 ms y consulta número o asunto en el backend. Admite
`TK-000123`, `000123`, `123` y texto del asunto, por coincidencia parcial. `search`, `status`,
`categoryId`, `page` y `pageSize` se conservan en la URL; cambiar un filtro vuelve
a página 1. Se ofrecen tamaños 10, 20 y 50. El número enlaza al detalle mediante
un enlace nativo accesible. Fechas UTC se presentan en español y zona del navegador.

La pantalla diferencia carga, ausencia de tickets, ausencia de coincidencias y
error con reintento. Ofrece crear el primer ticket o limpiar filtros. El
administrador puede filtrar por categorías inactivas; para otros roles la API
existente solo permite descubrir categorías activas. Un enlace con un ID
histórico sigue funcionando y presenta una opción de categoría histórica.

## Crear

«Nuevo ticket» abre `app-modal` con asunto, categoría y descripción. Valida
obligatorios, contenido sin espacios vacíos y longitudes de 160/5000 caracteres.
Solo ofrece categorías activas. No contiene campos de solicitante, estado,
agente, prioridad o adjuntos. Bloquea doble envío y cierre durante la creación.

Tras un 201 cierra el modal, anuncia «Ticket TK-000123 creado correctamente.»
con el número devuelto por la API y recarga la
lista y abre `/tickets/:id`. Un error conserva el texto. Si la categoría ya no
está disponible, limpia su selección y recarga categorías para elegir otra,
conservando asunto y descripción. El reintento de categorías también es visible.

## Detalle y seguridad

El detalle muestra número, asunto, estado, categoría, solicitante, agente,
creación y descripción. Agente nulo muestra «Sin asignar». La descripción usa
interpolación de texto y `whitespace-pre-wrap`, sin interpretación HTML.
Un 404 muestra «No se encontró el ticket.»; otros errores permiten reintentar.
El detalle incorpora los controles de asignación y transición descritos a continuación.

`TicketsApi` tipa listados, detalle, creación, agentes, asignación, transiciones y eventos; comparte interceptor de sesión,
JSON y tratamiento de errores. No almacena sesiones, contraseñas ni tickets en
localStorage o sessionStorage. Refrescar vuelve a consultar PostgreSQL.

`npm run check` cubre API con HttpTestingController, URL, debounce, filtros,
paginación, estados de pantalla, creación, doble envío, conservación del texto,
notificación, navegación y detalle seguro. No necesita red ni backend.

## Asignación y acciones del detalle

`permisosTicket` combina rol y propiedad sin duplicar acciones. El listado conserva
su rejilla y vuelve a consultar al entrar. Los cambios se hacen en `/tickets/:id`.
Agente solo ve Asignarme cuando el ticket está libre en creado/en_proceso/en_espera.
Supervisor y administrador ven selector de agentes válidos y Guardar asignación;
reasignar/desasignar requieren app-confirmacion. Asignarme y asignación inicial son
directas. La lista mínima de agentes no concede acceso a Usuarios.

Con agente asignado, el agente responsable y supervisor/administrador ven:
Creado → Iniciar atención; En proceso → Poner en espera/Marcar como resuelto;
En espera → Reanudar atención/Marcar como resuelto. Sin agente no se ofrecen estas
acciones. Propietario, supervisor o administrador pueden cancelar solo Creado y
En espera, y cerrar/reabrir solo Resuelto. El propietario ve «El problema continúa»
para reabrir. En Cerrado/Cancelado no hay controles; Resuelto no admite asignación.
Ser agente asignado no concede cierre/reapertura de tickets ajenos.

Resolver, reabrir, cerrar y cancelar requieren confirmación. Durante el envío se
bloquean los controles y se impiden duplicados. El éxito actualiza el ticket y
recarga la actividad sin recargar el navegador, con app-aviso-flotante. Un 409
muestra el mensaje del servidor y avisa de actualización concurrente; recarga el
detalle y actividad. Los errores de lectura de agentes/actividad tienen reintento.
El backend sigue siendo la autoridad: el cliente solo envía agentId o action.

## Actividad

Se muestra más reciente primero, con fecha en zona del navegador y nombres,
sin correo del actor. Paginación inicial 50, opciones 20/50/100. El texto se genera
a partir de created, assigned, reassigned, unassigned y status_changed; no se guarda
en SQL ni se interpreta HTML. Distingue autoasignación, reasignación, resolución,
reapertura, cierre y cancelación. Conserva las referencias TK y la descripción.

Para tickets previos solo se recuperó creación; no se inventan estados intermedios.
Hay pruebas sin red para derechos combinados, controles, confirmaciones, todos los
tipos de evento, paginación, error 409 y recarga. La matriz exacta y los nueve arcos
permitidos están en [la documentación de API](../../backend/docs/tickets.md).

No incorpora prioridad, comentarios, notas, adjuntos, correo/Telegram de tickets,
SLA, tiempos de respuesta ni actualizaciones en tiempo real.
