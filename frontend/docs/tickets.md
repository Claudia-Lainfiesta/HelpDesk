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
`categoryId`, `priority`, `page` y `pageSize` se conservan en la URL; cambiar un filtro vuelve
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
agente ni prioridad. Admite una imagen opcional solo durante la creación. Bloquea doble envío y cierre durante la creación.

Tras un 201 cierra el modal, anuncia «Ticket TK-000123 creado correctamente.»
con el número devuelto por la API y recarga la
lista y abre `/tickets/:id`. Un error conserva el texto. Si la categoría ya no
está disponible, limpia su selección y recarga categorías para elegir otra,
conservando asunto y descripción. El reintento de categorías también es visible.

## Detalle y seguridad

El detalle muestra número, asunto, estado, categoría, solicitante, agente, prioridad,
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
a partir de created, assigned, reassigned, unassigned, status_changed, priority_changed y note_added; no se guarda
en SQL ni se interpreta HTML. Distingue autoasignación, reasignación, resolución,
reapertura, cierre y cancelación. Conserva las referencias TK y la descripción.

Para tickets previos solo se recuperó creación; no se inventan estados intermedios.
Hay pruebas sin red para derechos combinados, controles, confirmaciones, todos los
tipos de evento, paginación, error 409 y recarga. La matriz exacta y los nueve arcos
permitidos están en [la documentación de API](../../backend/docs/tickets.md).

No incorpora comentarios públicos, adjuntos posteriores, correo de tickets,
SLA, tiempos de respuesta ni actualizaciones en tiempo real.

## Prioridad

El listado incluye una columna Prioridad con app-insignia-prioridad para todos los
roles, y un selector Todas/Baja/Media/Alta/Urgente. Conserva priority en la URL junto
con los demás filtros; cambiarlo vuelve a página 1. Se mantiene el orden de creación
e ID descendentes; prioridad no participa en la búsqueda ni cambia el orden.

El detalle muestra la insignia cerca del estado. El agente actualmente asignado,
supervisor o administrador ve Nueva prioridad y Cambiar prioridad en Creado,
En proceso, En espera y Resuelto. Un solicitante u otro agente solo ve el valor;
ser propietario no añade permiso, incluso si tiene rol agente. Cerrado/Cancelado
conservan la insignia y ocultan edición.

El cambio no requiere confirmación. Impide doble envío, deshabilita controles
mientras espera y anuncia «Prioridad actualizada a Alta.» con el valor devuelto.
Actualiza ticket y actividad; los conflictos recargan ambos. Un error conserva
el valor confirmado y muestra el mensaje de la API.

TicketsApi.cambiarPrioridad envía únicamente `{ priority }` como JSON. Los tipos
TicketPriority y los modelos solo admiten baja/media/alta/urgente. El modal Nuevo
ticket conserva sus tres campos: no ofrece selector ni envía prioridad; nace Media.

El evento estructurado priority_changed se presenta como «Juan Pérez cambió la
prioridad de Media a Alta.». La frase se genera en la interfaz, sin almacenarla.
No modifica estado, asignación o fechas de resolución/cierre/cancelación. No hay
prioridad automática, SLA, escalamiento ni orden por urgencia. Urgente sí genera avisos según la guía de notificaciones.

Tokens de texto: Baja usa info; Media texto-suave; Alta aviso; Urgente peligro.
Estado y prioridad llevan texto semibold, sin fondo, borde, cápsula ni punto.
No se agregan colores. La galería
/guia-ui incluye las cuatro insignias únicamente durante desarrollo.

## Contacto directo por Telegram

Solo el propietario de un ticket no terminal ve «Hablar por Telegram», salvo que
sea él mismo el agente asignado. El destino es el @usuario público del agente,
configurado por el administrador en Usuarios. No se usan nombres/correos para
adivinar contactos ni IDs numéricos para construir enlaces.

TicketsApi.contactoTelegram consulta GET /api/tickets/:id/telegram-contact al
cargar el detalle autorizado, antes del clic; así se abre la pestaña directamente
desde una acción del usuario, sin depender de una respuesta asíncrona. El botón
usa app-boton y window.open con noopener,noreferrer. Solo admite URLs https://t.me
con el formato esperado y únicamente el parámetro text. El backend prepara
`Hola, te contacto por el ticket TK-000123: "Asunto del ticket".` desde datos reales,
correctamente codificados. Telegram lo deja en el cuadro de texto; el usuario decide
si lo envía. La interfaz no construye el mensaje ni envía username o texto al endpoint.
No expone tokens ni inicia el proceso del bot.

Si no hay agente, avisa «Este ticket todavía no tiene un agente asignado.»; si
no tiene contacto disponible, «Este agente no tiene Telegram configurado.».
Actualizar contacto permite reintentar. Se respetan permisos y errores del backend.
No se genera actividad, nota, cambio de estado, prioridad o asignación al abrirlo.
La conversación es externa; HelpDesk no puede saber si se entregó o respondió un mensaje.

## Notas internas en Actividad

El agente asignado, supervisor y administrador ven las notas que devuelve la
cronología. Solicitante y agente no asignado no reciben los eventos note_added:
el backend los elimina antes de contar y paginar. La interfaz no anuncia notas
ocultas. Ser propietario con rol agente no añade permiso interno. Tras reasignar,
el nuevo agente recibe todo el expediente interno y el anterior deja de recibirlo.

Las notas se distinguen mediante una tarjeta suave, autor, «Nota interna» y fecha,
con texto interpolado y saltos de línea. No usa innerHTML, Markdown ni burbujas de
chat. Se conserva la única cronología, más reciente primero, y la paginación existente.

En tickets no terminales, soporte autorizado ve app-area-texto «Agregar nota interna»,
con ayuda de privacidad y validación de 1–5000 caracteres después de trim. POST
/api/tickets/:id/notes solo envía body. El envío se bloquea para evitar duplicados;
el error conserva el borrador. Tras 201 limpia el campo, recarga solo actividad y
anuncia «Nota interna agregada.». No modifica el ticket ni llama a transiciones.

En Cerrado/Cancelado no hay formulario; soporte sigue viendo el historial y el
aviso de solo lectura. No existen controles de edición o eliminación de notas.
No hay GET de notas separado, mensajes públicos, chat interno, adjuntos posteriores ni envíos
automáticos por correo o Telegram.

Para comprobarlo: propietario abre contacto; soporte asignado agrega una nota;
otro agente y solicitante recargan y no reciben esa nota; supervisor reasigna y
solo el nuevo agente mantiene acceso. Un texto como `<script>alert(1)</script>`
debe verse literalmente. Las pruebas usan HttpTestingController y no requieren Telegram.

## Imagen opcional al crear

El modal Nuevo ticket ofrece «Imagen (opcional)», un input sin multiple con
accept=image/jpeg,image/png,image/webp. Ayuda: «JPG, JPEG, PNG o WebP. Máximo 10 MB.».
El límite real es 10 MiB (10485760 bytes) y se comprueban MIME y tamaño en cliente;
el backend es la autoridad y verifica también firma/extensión. No se carga en
localStorage, sessionStorage, IndexedDB, URL de navegación ni consola.

Se presenta un preview y «Quitar imagen» antes de crear. Se revoca ObjectURL al
cambiar, quitar, completar el alta o destruir/cancelar el formulario. El archivo
solo permanece en memoria. Errores conservan texto e imagen para reintentar;
solo el éxito limpia ambos y emite el ticket. No hay editor, recorte ni procesamiento.

TicketsApi.crear siempre envía FormData con subject, description, categoryId e image
solo si existe. El interceptor mantiene withCredentials y elimina Content-Type
manual para FormData: el navegador añade boundary. El resto de escrituras sigue
usando JSON, incluido logout con {} y notas/prioridad/transiciones.

Todas las representaciones Ticket tienen attachment (metadata) o null, sin Base64
ni bytes. El detalle solo crea ImagenAdjunta cuando existe metadata, sin petición
para tickets sin imagen. HttpClient obtiene Blob del endpoint protegido con cookie,
crea un ObjectURL temporal y lo revoca al destruir o fallar. Muestra carga, error
independiente con reintento y alt «Imagen adjunta al ticket TK-000123». La ampliación
abre el Blob en otra pestaña mediante enlace noopener noreferrer.

La imagen inicial no se puede agregar, reemplazar ni quitar después. Se informa:
«Si necesitas compartir más imágenes después de crear el ticket, puedes hacerlo
por Telegram cuando tengas un agente asignado». No cambia estados, prioridad,
actividad ni notas. El acceso a la imagen lo comprueba el backend como el detalle.

Consulta también la [guía de notificaciones](notificaciones.md) para destinatarios por evento y avisos generales al grupo.

## Pulido visual y móvil

`/tickets` es una vista dividida desde `lg` (1024 px): la lista compacta, búsqueda,
estados, filtros y paginación quedan a la izquierda; la vista previa permanece a
la derecha mientras se recorre la lista. La selección usa un botón con
`aria-pressed`, borde de marca y fondo suave, sin navegar ni cambiar la URL.
Inicialmente se invita a seleccionar un ticket; no se consulta un detalle arbitrario.

En móvil y tablet vertical se presenta una sola columna. Seleccionar reemplaza
visualmente la lista por la vista previa y mueve el foco al panel. «Volver a la
lista» restaura los filtros, la página y el foco del ticket seleccionado. Un solo
DOM de la lista conserva número, asunto, categoría, estado, prioridad, agente y
fecha. Textos largos y filtros envuelven sin desplazamiento horizontal.

La vista previa incluye descripción en texto plano, metadatos, Detalles/Actividad,
contacto Telegram cuando procede y las acciones permitidas de estado, asignación
y prioridad. `GestionTicket` comparte lectura, permisos, peticiones y confirmaciones
con el detalle completo: no existe una segunda implementación de reglas. Mientras
se envía una acción se bloquean selección, filtros y paginación; el éxito actualiza
la fila y vuelve a consultar el listado para respetar los filtros. Las selecciones
obsoletas cancelan su lectura; salir de la página filtrada retira la selección.

«Abrir detalle completo» conserva `/tickets/:id` para ver la imagen inicial o
agregar notas internas. Crear un ticket mantiene el flujo de apertura del detalle.
El panel no añade endpoints ni operaciones. Las notas de Actividad siguen las
mismas restricciones de visibilidad y los estados terminales conservan solo sus
acciones permitidas.

El solicitante ve al agente en el resumen; la tarjeta Asignación solo aparece si
ofrece controles reales. Telegram conserva su deep-link y añade un icono local.
La imagen adjunta es el propio enlace a la vista grande, con foco y activación por
teclado, sin «Ver imagen más grande» redundante. Los avisos usan el toast compartido
compacto. Se conservan las confirmaciones de cancelar, cerrar y reabrir; no se
agrega confirmación a operaciones ordinarias.
