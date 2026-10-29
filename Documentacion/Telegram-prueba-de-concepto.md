# Telegram: prueba de concepto S0-06 y hallazgos para EP-06

## Diseño y alcance

Un bot normal no puede iniciar un chat privado con una persona: esta debe
abrirlo y escribirle primero. Tampoco observa las conversaciones privadas
entre dos personas. Por eso el diseño es un **relevo**: solicitante y agente
escriben al mismo bot y este copia los mensajes al otro chat. Véase la
[introducción oficial de bots](https://core.telegram.org/bots).

La POC usa grammY y guarda únicamente referencia de ticket, roles, IDs de chat
y el último emisor etiquetado. El emparejamiento es temporal, un ticket y un rol
por chat. Acepta referencias `TK-` con al menos seis dígitos, sin consultar su
existencia. No crea tickets ni modifica usuarios, estados o responsables.

## Contenido y errores

El relevo usa [copyMessage](https://core.telegram.org/bots/api#copymessage) con
IDs de origen, destino y mensaje. No descarga archivos ni persiste textos,
pies de foto o mensajes. El Update recibido existe transitoriamente mientras
se procesa; no se conserva como historial ni se registra su contenido. Telegram
y los clientes de los participantes siguen conservando sus propias conversaciones.

La etiqueta y la copia son dos solicitudes separadas. La etiqueta se marca como
enviada tras su éxito, para no repetirla con cada mensaje. Si luego falla la
copia, la etiqueta puede quedar sola. Ante fallos se avisa al emisor sin
reintentar ni modificar el ticket. Un error de red puede dejar incierto si la
entrega ocurrió; no se promete entrega exactamente una vez. Si tampoco puede
enviarse el aviso, queda un log de metadatos con resultado fallido.

Esta POC no recibe notas internas del HelpDesk. Todos los mensajes comunes de
Telegram son conversación externa; los comandos no se copian. Una futura
integración deberá mantener separados los eventos de conversación y las notas
internas, sin conectarlas al relevo.

## Base para una vinculación verificable futura

Telegram permite enlaces `https://t.me/<bot>?start=<código>`. El parámetro admite
hasta 64 caracteres de `A-Z`, `a-z`, `0-9`, guion y guion bajo. Es una base para
una vinculación futura, **no una vinculación implementada en esta POC**.
[Documentación de deep linking](https://core.telegram.org/bots/features#deep-linking).

Propuesta para una historia posterior: desde una sesión autenticada de HelpDesk,
generar un código aleatorio, opaco, de un solo uso y con caducidad. Al recibirlo
en `/start`, validarlo y consumirlo atómicamente, asociándolo con el ID real de
Telegram del remitente. No confiar en un username ni en un código predecible
derivado del ID del empleado. Definir también confirmación y desvinculación.

## Long polling y producción

En desarrollo se usa `getUpdates` secuencial. Solo debe haber una instancia por
bot; cada integrante del equipo crea el suyo. Polling y webhook son excluyentes.
El arranque comprueba el webhook y no lo borra. `telegram:check -- --delete-webhook`
permite quitarlo explícitamente. El error 409 explica ambas causas posibles.

No se usa `bot.start()`: grammY reintenta solicitudes y elimina webhooks desde
ese método. La POC usa su API y su despachador con un bucle sin reintentos;
SIGINT/SIGTERM cancelan la espera y dejan terminar el mensaje en curso.
Se declara `abort-controller`, ya utilizado por grammY, para usar su mismo tipo
de señal sin conversiones de tipos inseguras.

En producción se evaluará un endpoint HTTPS para webhook y la validación del
header `X-Telegram-Bot-Api-Secret-Token`, configurado mediante `secret_token`.
Eso requiere decisiones posteriores de despliegue y deduplicación; no se añade
el endpoint aquí. [Webhook y autenticidad de solicitudes](https://core.telegram.org/bots/api#setwebhook).

## Límites a considerar

- Telegram recomienda evitar más de un mensaje por segundo hacia un mismo chat;
  para difusión gratuita indica aproximadamente 30 mensajes por segundo en total.
  La etiqueta adicional también consume una solicitud. La POC puede recibir 429
  y lo informa; no incorpora throttling, colas ni reintentos.
  [Límites oficiales de bots](https://core.telegram.org/bots/faq#how-do-i-avoid-hitting-limits).
- Algunos tipos, como mensajes de servicio o facturas, no son copiables. Un
  rechazo de copia se comunica al remitente. El formato y los tamaños aceptados
  dependen del tipo de mensaje y de los límites vigentes de la Bot API.
- Telegram mantiene actualizaciones pendientes como máximo 24 horas. Eso es
  almacenamiento de Telegram, no una cola del HelpDesk. Un reinicio puede volver
  a recibir actualizaciones aún no confirmadas; esta POC no ofrece deduplicación
  persistente. [Recepción de actualizaciones](https://core.telegram.org/bots/api#getting-updates).
- Álbumes se copian mensaje a mensaje; no se conserva su agrupación. No se
  sincronizan ediciones ni eliminaciones. Un bloqueo del bot o una cuenta que
  no haya iniciado el chat impiden la entrega.

## Fuera de esta prueba

No incluye vinculación con `users`, autenticación de roles, permisos de tickets,
cambios de esquema, notificaciones automáticas, webhooks, cálculo de primera
respuesta, endpoints de negocio, creación de tickets desde Telegram, historial
de chat, persistencia de sesiones, entrega garantizada ni alta disponibilidad.

Las pruebas automáticas validan sesiones, comandos, copia en ambos sentidos,
etiquetas, errores, cancelación y privacidad mediante pasarelas y APIs falsas.
La prueba real con dos cuentas queda para la ejecución manual del equipo según
el guion en `backend/README.md`; no se ha realizado con credenciales reales.
