# Correo y recuperación asistida

El HelpDesk usa SMTP para avisar al administrador cuando una cuenta local pide
ayuda. Nodemailer 10 incluye sus tipos y funciona con Node 22. El código de
recuperación solo utiliza una pasarela de correo; no depende de una API HTTP
de Brevo ni de Mailpit. No hay enlaces, códigos ni tokens de recuperación.

## Solicitud y restablecimiento son operaciones distintas

1. El usuario abre `/recuperar-contrasena` y envía su correo.
2. `POST /api/auth/recovery-request` valida la entrada y los límites.
3. Si la cuenta es local, activa y no vencida, se registra
   `auth.recovery_requested` con actor nulo, objetivo de usuario, IP y metadatos
   vacíos. La transacción se confirma antes de intentar enviar.
4. La API devuelve el mismo `202` para todas las cuentas y los correos
   inexistentes. El aviso se programa después de responder, dentro del proceso.
5. Administración recibe nombre y correo de la cuenta, sin datos de sesión ni
   credenciales. Debe comprobar la identidad por el procedimiento autorizado;
   recibir una solicitud no acredita quién la envió.
6. El administrador entra a Usuarios y usa el restablecimiento existente si
   procede. Esa operación exige cambio de contraseña y revoca sesiones. Si solo
   corresponde desbloquear, dispone de la acción administrativa de desbloqueo.
7. La contraseña temporal se muestra una vez dentro del HelpDesk. Se entrega
   por un medio distinto del correo y nunca se incluye en un mensaje SMTP.

La solicitud pública no cambia contraseñas, bloqueo, activación, roles,
vencimiento ni sesiones. Se procesa antes de `attachSession`, por lo que ni
siquiera actualiza `last_seen_at`. Una cookie de contraseña temporal no bloquea
esta ruta pública; las restricciones del resto de la API se conservan.
Las cuentas bloqueadas siguen siendo elegibles si están activas y no vencidas.
Las cuentas inactivas o vencidas no generan aviso.

## Contrato público y límites

```http
POST /api/auth/recovery-request
Origin: http://localhost:4200
Content-Type: application/json

{"email":"persona@example.invalid"}
```

El correo se recorta, valida con el mismo esquema del login (máximo 254) y
normaliza a minúsculas. Solo se admite ese campo. La respuesta lleva
`Cache-Control: no-store`:

```json
{
  "message": "Si el correo corresponde a una cuenta habilitada, administración recibirá un aviso."
}
```

El status y cuerpo no indican existencia, activación o vencimiento,
incluso si SMTP falla. Un correo inválido devuelve `400 INVALID_INPUT`.
Las protecciones globales siguen rechazando origen inválido con 403 y cuerpo
no JSON con 415. Un fallo de base de datos responde con el error interno genérico;
no se acepta una solicitud elegible cuya auditoría no pudo confirmarse.

Los límites son independientes del login: 10 peticiones por IP cada 15 minutos
y 3 por correo normalizado cada 60 minutos, configurables. El límite de correo
se aplica también si no existe, con clave SHA-256 y sin almacenar el correo en
claro en el limitador. IPv6 utiliza la agrupación del limitador existente.
Un exceso devuelve `429 RECOVERY_RATE_LIMIT` y el mensaje «Has realizado
demasiadas solicitudes. Intenta más tarde.» sin identificar el correo.
`TRUST_PROXY` conserva el mecanismo existente de IP; no se confía en cualquier
cabecera enviada por el cliente.

Los limitadores residen en memoria y se reinician con el proceso. Un despliegue
con varias instancias necesitará un almacén compartido, igual que el login.
El SMTP no introduce una espera distinta por cuenta; no se promete igualdad
exacta de tiempos de base de datos entre consultas y transacciones auditadas.

## Entorno

| Variable                        | Predeterminado o requisito                                           |
| ------------------------------- | -------------------------------------------------------------------- |
| `SMTP_HOST`                     | `127.0.0.1`                                                          |
| `SMTP_PORT`                     | `1025`; entero de 1 a 65535                                          |
| `SMTP_SECURE`                   | `false`; solo `true` o `false`, TLS implícito si es true             |
| `SMTP_REQUIRE_TLS`              | `false`; exige STARTTLS cuando no hay TLS implícito                  |
| `SMTP_USER`, `SMTP_PASSWORD`    | Ambos vacíos o ambos definidos; sin valores de ejemplo secretos      |
| `MAIL_FROM`                     | Obligatorio; correo válido del remitente                             |
| `RECOVERY_ADMIN_EMAIL`          | Obligatorio; correo administrativo fijo, nunca tomado de la petición |
| `RECOVERY_RATE_LIMIT_PER_IP`    | `10`; entero de 1 a 10000                                            |
| `RECOVERY_RATE_LIMIT_PER_EMAIL` | `3`; entero de 1 a 1000                                              |

Las direcciones se leen del entorno; no están incrustadas en la plantilla ni
como valores predeterminados del parser. `.env.example` contiene las direcciones
acordadas del proyecto y `SMTP_PASSWORD` vacío. Los errores de configuración
nombran variables, nunca sus valores. No se desactiva la validación de certificados;
se requiere como mínimo TLS 1.2 cuando se negocia TLS.

## Mailpit local con Podman

Añade las variables no secretas de `.env.example` a tu `.env` privado sin
reemplazar el resto de la configuración:

```dotenv
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_REQUIRE_TLS=false
SMTP_USER=
SMTP_PASSWORD=
MAIL_FROM=eduanleu789@gmail.com
RECOVERY_ADMIN_EMAIL=eduanleu789@gmail.com
```

```bash
npm run db:up
npm run db:migrate
npm run mail:up
npm run mail:check
npm run dev
```

En otra terminal, desde `frontend/`, ejecuta `npm start`. Abre la recuperación
y solicita ayuda para una cuenta habilitada. Mailpit captura el aviso en
http://127.0.0.1:8025 sin entregarlo a Internet. Verifica remitente, destinatario,
asunto y la ausencia de credenciales. Un correo inexistente, una cuenta
inactiva o una vencida muestran la misma confirmación y no
agregan mensajes. Después, un reset administrativo debe seguir mostrando la
clave exclusivamente en HelpDesk, sin añadir mensajes a Mailpit.

`compose.yaml` fija `docker.io/axllent/mailpit:v1.32.0`; SMTP y web solo se publican
en loopback. No se añade volumen persistente para correo. `db:up` continúa
iniciando y comprobando exclusivamente PostgreSQL. `mail:logs` permite revisar
el servicio local; evita activar trazas SMTP o copiar contenido a reportes.
Para detener solo Mailpit usa `podman compose stop mailpit`.
`db:down` ya ejecutaba `compose down`: ahora detiene ambos servicios del compose,
sin borrar el volumen de PostgreSQL.

## Brevo: configuración privada

Configura estos valores únicamente en tu `.env` privado y reinicia la API:

```dotenv
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_REQUIRE_TLS=true
SMTP_USER=<copiar Login SMTP desde Brevo>
SMTP_PASSWORD=<pegar aquí mi clave SMTP>
MAIL_FROM=eduanleu789@gmail.com
RECOVERY_ADMIN_EMAIL=eduanleu789@gmail.com
```

Usa el Login SMTP exacto de Brevo; puede ser distinto del remitente. La clave
SMTP no es la contraseña de tu correo ni una clave de API HTTP. Verifica el
remitente en Brevo antes de enviar. El parser exige autenticación y TLS para
este host, con STARTTLS en 587. No se permite enviar en claro como alternativa.
Consulta las guías oficiales de [Brevo SMTP](https://help.brevo.com/hc/en-us/articles/7924908994450-Send-transactional-emails-using-Brevo-SMTP)
y [STARTTLS en Nodemailer](https://nodemailer.com/smtp).

```bash
npm run mail:check
npm run dev
```

`mail:check` comprueba conexión y autenticación sin enviar correo y solo indica
éxito o un error saneado. Después abre `/recuperar-contrasena` y solicita ayuda
para una cuenta habilitada; verifica el aviso en el buzón administrativo.
No incluyas claves, mensajes SMTP originales ni `.env` en capturas o reportes.

## Fallos, seguridad y alcance

Se reutiliza un transporter, sin `verify()` por mensaje, sin logs de SMTP y con
tiempos máximos de conexión y envío. La tarea diferida captura rechazos y fallos
síncronos. Los logs solo incluyen resultado e ID interno, nunca correos, nombres,
contraseñas, cookies, claves, tokens ni el error original del proveedor.
El asunto es fijo y el cuerpo es texto plano; no hay HTML, adjuntos, tracking ni
enlaces. Solo se incorporan nombre y correo desde la cuenta consultada.

No hay cola persistente, workers ni reintentos durables. Detener el proceso
tras responder puede perder el aviso; un fallo SMTP tampoco cambia el `202` ni
se comunica al solicitante como confirmación de entrega. El evento de auditoría
registra la solicitud elegible, no garantiza que el correo se haya entregado.
Una cola con confirmaciones y reintentos queda para una etapa posterior.
No se implementa registro público ni recuperación automática. El canal concreto para verificar identidad y entregar la contraseña
continúa siendo parte del procedimiento administrativo, no de este endpoint.

## Pruebas y CI

`npm run check` valida todo el backend. Sin `DATABASE_URL` exportada se omiten
las integraciones con mensaje explícito; las unitarias funcionan sin servicios.
Para incluir la integración, exporta la configuración local sin imprimirla:

```bash
set -a
source .env
set +a
npm run check
```

La nueva suite crea y elimina un esquema aislado. Comprueba elegibilidad,
auditoría, conservación íntegra de usuarios/sesiones y fallos SMTP. La pasarela
está simulada en las pruebas y CI nunca contacta Mailpit ni Brevo. CI solo define
direcciones `@example.invalid`; no contiene credenciales SMTP. Las pruebas
frontend usan HttpTestingController y no requieren backend.
