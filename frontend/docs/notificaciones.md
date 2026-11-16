# Notificaciones personales

La campana del header autenticado está disponible para los cuatro roles. Cada
usuario solo recibe su bandeja; el backend toma su identidad de la sesión.
No se muestra durante el cambio obligatorio de contraseña, cuyo layout sigue
sin navegación. No usa almacenamiento local ni preferencias persistidas.

El contador oculta el badge con cero; muestra 1–99 y `99+` desde 100. Su nombre
accesible expresa también la cantidad exacta. El panel se abre con la campana,
recibe foco y permite cerrar con Escape, botón o clic fuera. Escape/cierre
explícito devuelven el foco a la campana. Mantiene ancho acotado y desplazamiento
vertical; navegación por teclado con controles nativos.

El listado se carga solo al abrir, con páginas de 20 y anterior/siguiente cuando
hay más datos. Cada elemento presenta título, mensaje escapado, fecha/hora en
español y zona del navegador, y «Sin leer» más negrita si corresponde. No depende
solo del color. Incluye carga, vacío («No tienes notificaciones.»), error y
reintento. Si una lectura falla, conserva el elemento y no navega.

Al pulsar un elemento, PATCH lo marca como leído y después navega a
`/tickets/:id`. Sin ticket solo marca. El detalle conserva sus autorizaciones;
la bandeja no otorga nuevos permisos sobre el expediente. Marcar todas utiliza
POST y actualiza los elementos y badge; se deshabilita con cero. Las mutaciones
usan JSON vacío y el interceptor habitual con credenciales/CSRF.

`NotificationsApi` define contratos cerrados y llamadas HTTP;
`NotificationsService` mantiene signals de contador, items, carga, error y página.
Una instancia pertenece al componente Campana. Al cerrar sesión, cambiar de
usuario o destruirlo se cancelan sus consultas/timers y se borra el estado.

El contador se refresca al montar el shell después del login/restauración, al
navegar, tras marcar lectura y cada 30 segundos. Se consulta solo unread-count,
no el listado completo. En pestaña oculta se omiten consultas y al volver a ser
visible se refresca. switchMap cancela contadores obsoletos. No hay WebSockets,
SSE, push ni notificaciones del sistema operativo.

Las reglas de eventos se describen en el [contrato backend](../../backend/docs/notifications.md):
asignación/reasignación, inicio de atención (`ticket_started`), espera, resolución, reapertura, cierre y cambio a Urgente,
sin auto-notificaciones. No se avisa por notas, imágenes, creación propia,
resume/cancel ni lectura del ticket. Creado → En proceso notifica al propietario y nunca al grupo Telegram.

Los avisos al grupo Telegram son independientes de esta bandeja. Solo anuncian
creación, asignación, reasignación y Urgente, con información general. El contacto
«Hablar por Telegram» mantiene su deep-link al agente asignado; ninguno de estos
canales replica ni almacena conversaciones.

Pruebas sin backend/red: API, badge 0/1/25/100, panel, fechas, XSS escapado,
lectura/navegación, todas, errores, paginación, foco/Escape, polling, navegación,
pestaña oculta, logout, nuevo usuario y destrucción con solicitudes pendientes.
