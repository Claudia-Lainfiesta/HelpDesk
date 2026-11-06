# Tickets

`/tickets` consume exclusivamente la API. El backend determina visibilidad:
solicitante ve sus tickets; agente, supervisor y administrador ven todos.
Todos pueden crear para sí mismos y necesitan cambiar antes una contraseña
temporal. Las guardas conservan la sesión y el backend verifica cada petición.

La búsqueda espera 300 ms y consulta número o asunto. `search`, `status`,
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

Tras un 201 cierra el modal, anuncia el número devuelto por la API, recarga la
lista y abre `/tickets/:id`. Un error conserva el texto. Si la categoría ya no
está disponible, limpia su selección y recarga categorías para elegir otra,
conservando asunto y descripción. El reintento de categorías también es visible.

## Detalle y seguridad

El detalle muestra número, asunto, estado, categoría, solicitante, agente,
creación y descripción. Agente nulo muestra «Sin asignar». La descripción usa
interpolación de texto y `whitespace-pre-wrap`, sin interpretación HTML.
Un 404 muestra «No se encontró el ticket.»; otros errores permiten reintentar.
No se ofrecen botones de asignación o cambios de estado.

`TicketsApi` tipa `listar`, `obtener` y `crear`; comparte interceptor de sesión,
JSON y tratamiento de errores. No almacena sesiones, contraseñas ni tickets en
localStorage o sessionStorage. Refrescar vuelve a consultar PostgreSQL.

`npm run check` cubre API con HttpTestingController, URL, debounce, filtros,
paginación, estados de pantalla, creación, doble envío, conservación del texto,
notificación, navegación y detalle seguro. No necesita red ni backend.
