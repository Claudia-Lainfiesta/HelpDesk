# Administración de usuarios y categorías

`/usuarios` y `/categorias` requieren sesión, contraseña definitiva y rol
`administrador`. Las rutas se cargan de forma diferida. Las guardas llevan a
«Sin permiso» a otros roles; el backend comprueba de nuevo la autorización.
El acceso de categorías activas para otros roles permanece disponible en la API,
pero esta pantalla de administración está reservada al administrador.

## Usuarios

El listado usa `GET /api/users` y conserva `q`, `role`, `active`, `provider`,
`temporary`, `expired`, `page` y `pageSize` en la URL. Buscar espera 300 ms;
cambiar un filtro vuelve a la primera página. Recargar o compartir el enlace
restaura la vista. Los valores inválidos se normalizan antes de enviarlos.
La paginación admite hasta 100 registros. Un interruptor apagado no filtra;
si un enlace incluye expresamente `temporary=false` o `expired=false`, se respeta.

Cada fila muestra nombre, correo, rol, proveedor, vencimiento, estado y último
acceso. Las fechas ISO de la API se presentan en español con la zona del
navegador, también al editar mediante `datetime-local`. Puede haber varias
insignias simultáneas: por ejemplo, una cuenta inactiva y vencida.

«Nuevo usuario» pide nombre, correo y rol. Una cuenta local recibe contraseña
temporal; la de directorio no recibe contraseña ni puede iniciar sesión todavía.
Marcar «Cuenta temporal» fija acceso local y muestra el vencimiento. Si se deja
vacío al crear, el servidor aplica su duración estándar. El frontend no fija
los días ni el máximo: son configurables en el servidor y la API los valida.

Editar permite nombre, rol, vencimiento y notas. Correo y proveedor son de solo
lectura. `expirationRequired` impide quitar el vencimiento de una cuenta que
nació temporal; el máximo se cuenta desde la creación original. Las fechas sin
cambios no se reenvían, para poder editar otra información de cuentas vencidas.
Los cambios de rol o vencimiento piden confirmación antes de enviar PATCH.

El menú ofrece restablecer solo para acceso local y desbloquear solo mientras
`lockedUntil` siga en el futuro. Desactivar revoca sesiones; reactivar no
renueva vencimientos. Todas estas acciones piden confirmación. El administrador
no puede desactivarse, restablecerse la contraseña ni editar su propio rol;
la interfaz explica los controles deshabilitados. La API protege además al
último administrador disponible.

## Contraseña temporal

La respuesta de alta local o restablecimiento se transfiere al diálogo
`app-clave-temporal`. El campo `temporaryPassword` se elimina del objeto recibido;
no se guarda en servicios compartidos, rutas, URL, historial, consola ni
almacenamiento del navegador. No hay una petición para volver a consultarlo.

El diálogo muestra texto seleccionable y permite «Copiar» mediante la API de
portapapeles del navegador. Solo se escribe al portapapeles por esa acción
explícita; su resultado se anuncia. Si no está disponible, se puede seleccionar
y copiar manualmente. El portapapeles pertenece al usuario y no se borra
silenciosamente al cerrar.

No hay botón de cierre ni salida con Escape: se termina con «Ya la copié y
entregué». Ese botón elimina la referencia de la clave y retira el diálogo.
Destruir la vista también la elimina. Las cadenas de JavaScript son inmutables:
se eliminan las referencias accesibles de la aplicación, sin prometer un borrado
físico de memoria que el navegador no ofrece. Recargar nunca recupera la clave.
Se entrega por otro medio, no por correo. Si se pierde, hay que restablecerla.

## Categorías

La vista consulta `GET /api/categories?includeInactive=false`. «Mostrar inactivas»
envía `includeInactive=true`. El alta y la edición usan `name`, `description`
e `isActive`; el nombre admite de 1 a 80 caracteres y la descripción hasta 2000.
Un duplicado se muestra junto al nombre y en la alerta del formulario.

Desactivar y reactivar requieren confirmación, también si se cambia el
interruptor al editar. La categoría desactivada deja de ofrecerse en tickets
nuevos; los tickets existentes la conservan. No se ofrece borrado.

## Errores y estados

El mapa único está en `src/app/core/administracion/errores.ts`. Conserva también
el mensaje recibido del servidor, incluidos detalles y códigos nuevos.

| Código                                 | Mensaje o acción                                             |
| -------------------------------------- | ------------------------------------------------------------ |
| `EMAIL_EXISTS`                         | Correo ya registrado; asociado al correo                     |
| `INVALID_ROLE`                         | Elegir uno de los cuatro roles; asociado al rol              |
| `INVALID_EXPIRATION`                   | Fecha futura dentro del máximo; asociado al vencimiento      |
| `TEMP_LOCAL_REQUIRED`                  | Cuenta temporal con acceso local; asociado al proveedor      |
| `TEMP_EXPIRY_REQUIRED`                 | Mantener vencimiento obligatorio; asociado al vencimiento    |
| `SELF_DEACTIVATION`                    | No desactivar la propia cuenta                               |
| `SELF_ROLE_CHANGE`                     | No cambiar el propio rol                                     |
| `SELF_PASSWORD_RESET`                  | Usar Cambiar contraseña en el menú personal                  |
| `LAST_ADMINISTRATOR`                   | Conservar otro administrador activo, local y sin vencimiento |
| `DIRECTORY_ACCOUNT`                    | Contraseña gestionada en el directorio                       |
| `USER_NOT_FOUND`                       | Actualizar la lista de usuarios                              |
| `CATEGORY_EXISTS`                      | Nombre ya registrado; asociado al nombre                     |
| `CATEGORY_NOT_FOUND`                   | Actualizar la lista de categorías                            |
| `INVALID_INPUT` y códigos no conocidos | Mostrar el mensaje de la API en la alerta                    |
| `401`                                  | El interceptor vuelve al inicio de sesión                    |
| `PASSWORD_CHANGE_REQUIRED`             | El interceptor exige cambiar contraseña                      |

Las tablas distinguen carga, vacío y error con «Reintentar». Cada operación
correcta vuelve a consultar la lista y anuncia un aviso flotante de seis segundos.
Los errores de operaciones sensibles permanecen en su diálogo para poder revisar.
La API no incluye detalles estructurados por campo en `INVALID_INPUT`; la
asociación se hace cuando existe un código específico, sin adivinar campos.

## Accesibilidad y pruebas

Los diálogos atrapan Tab, bloquean el desplazamiento de fondo y devuelven el
foco al control de apertura cuando sigue disponible. Escape cierra salvo durante
una petición o en el diálogo de clave. Los menús usan flechas, Home, End, Enter
y Escape; omiten acciones deshabilitadas y muestran sus explicaciones.
Los campos comparten etiquetas, ayuda y errores asociados; los avisos usan
regiones vivas. Se respetan los tokens y la preferencia de movimiento reducido.

`npm run check` cubre los servicios con HttpTestingController, rutas, filtros,
formularios, acciones, diálogos, teclado, claves de una sola visualización y
protección de tokens, sin red ni backend. `npm run build` y
`npm run verify:production` comprueban además que `/guia-ui` no se publique.
La galería contiene ejemplos de todos los nuevos componentes.
