# Telegram en HelpDesk v1

Hay dos usos independientes; ninguno replica conversaciones dentro del HelpDesk.

## Contacto directo

El administrador configura y comprueba con el empleado su @usuario público.
El propietario de un ticket no terminal puede abrir «Hablar por Telegram» si tiene
agente asignado distinto de sí mismo. El backend genera un enlace HTTPS a `t.me`
con un borrador que contiene solo saludo, número TK y asunto. El usuario decide
si envía. Sin username se informa «Este agente no tiene Telegram configurado.».
No utiliza token, bot, ID numérico ni asociación inferida por nombre/correo.
[Contrato y permisos](../backend/docs/tickets.md#contacto-directo-por-telegram).

## Avisos generales al grupo

La API usa `fetch` y `sendMessage` con `TELEGRAM_BOT_TOKEN` y
`TELEGRAM_SUPPORT_CHAT_ID` opcionales. Solo anuncia creación, asignación,
reasignación y cambio a Urgente después del commit. No envía seguimiento,
notas, imágenes, asunto, solicitante ni correo. Tiempo máximo de espera de cuatro
segundos; un fallo saneado no revierte el negocio. Sin configuración no envía.
No hay polling, webhook, relevo privado ni lectura de mensajes.
[Configuración, plantillas y pruebas](../backend/docs/notifications.md).

HelpDesk no guarda ni sincroniza conversaciones. Las notas internas las escribe
soporte explícitamente y solo las recibe agente asignado, supervisor o administrador.
La comprobación de la entrega en un grupo real y del borrador en los clientes
Telegram requiere cuentas reales; las pruebas automatizadas usan pasarelas falsas.
