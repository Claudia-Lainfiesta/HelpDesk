# Decisiones de producto de HelpDesk

El 29-oct-2026 el equipo, haciendo el papel del cliente, cerró las decisiones
de S0-08. Este registro recoge lo acordado; los puntos que todavía necesitan
una decisión están separados al final. Este registro distingue acuerdos de
producto de implementación: cálculo de primera respuesta, SLA, artículos,
consulta de auditoría y respaldos siguen siendo trabajo futuro. El estado actual
está en [README.md](README.md).

| Fecha | Decisión | Motivo breve | Historias o épicas afectadas |
| --- | --- | --- | --- |
| 29-oct-2026 | La primera respuesta es el primer cambio del ticket a **En proceso**. Se calcula desde el historial de cambios de estado, que registra quién cambió, de cuál a cuál y cuándo; no se usa una columna aparte. Solo cuenta la primera vez, aunque el ticket vuelva a otro estado y después a En proceso. No cuentan notificaciones automáticas, notas internas ni mensajes de Telegram. | Medir un evento trazable del caso sin depender del canal de conversación. | EP-02, EP-04 y EP-08; HU-02-01, HU-02-09, HU-04-04 y HU-08-05; D-26. |
| 6-nov-2026 | Los seis estados se gestionan con las nueve transiciones de [tickets](../backend/docs/tickets.md). Asignar no cambia estado. Agente asignado, supervisor o administrador atienden/resuelven. Propietario de cualquier rol, supervisor o administrador cierran/reabren Resuelto y cancelan solo Creado/En espera. Cerrado/Cancelado son terminales. | Sustituye selección libre, cierre por agente y cancelación exclusiva del supervisor; separa resolución de confirmación y combina rol con propiedad. | EP-01, EP-02 y EP-03; HU-02-01, HU-02-06, HU-02-07, HU-02-08; D-06, D-10, D-13 y D-14. |
| 29-oct-2026 | El supervisor concede las excepciones de tiempo de SLA; la prioridad operativa se rige por la decisión del 15-nov-2026. | Concentrar estas decisiones y su justificación en la supervisión del servicio. | EP-04; HU-04-02, HU-04-03 y HU-04-06; D-23 y D-27. |
| 29-oct-2026 | El supervisor revisa los artículos de conocimiento y el administrador los publica. | Separar la revisión del contenido de su publicación. | EP-07; HU-07-04 y HU-07-05; D-48. |
| 29-oct-2026 | Las funciones técnicas de auditoría y respaldo corresponden al supervisor y al administrador. Por seguridad, en la práctica las realiza un tercero externo que acude presencialmente a la empresa y entra localmente con cuentas temporales de auditoría creadas por el administrador: una de solicitante, una de agente, una de supervisor y una de administrador. Usan los cuatro roles existentes, vencen automáticamente en la fecha indicada y sus acciones quedan registradas a nombre de la cuenta de auditoría utilizada; no hay un quinto rol. | Comprobar el sistema de forma externa y presencial sin compartir credenciales de empleados, con acceso limitado en el tiempo y acciones atribuibles a la cuenta de auditoría. | EP-05 y EP-10; HU-05-01, HU-10-06, HU-10-07, HU-10-08 y HU-10-09; D-74 y D-75. |
| 29-oct-2026 | Cada usuario tiene **un solo rol a la vez**: solicitante, agente, supervisor o administrador. | Evitar combinaciones simultáneas y mantener claro el rol vigente. | EP-05; HU-05-05 y HU-05-07; D-35. |
| 29-oct-2026 | La referencia del ticket tiene el formato **`TK-XXXXXX`**, con un mínimo de seis dígitos; no se recortan números mayores que 999999. | Reconocer y compartir una referencia uniforme del caso. | EP-01 y EP-02; HU-01-01. |
| 29-oct-2026 | La plataforma será **web**. | Mantener la modalidad acordada para el proyecto actual. | S0-01, S0-08 y los recorridos del portal y de atención. |

## Pendientes y consideraciones

- **Validación real de Telegram — PENDIENTE:** probar el relevo en ambos
  sentidos con dos cuentas reales. La prueba de concepto no se ha validado
  con una segunda cuenta real; las pruebas automáticas con pasarelas falsas
  no sustituyen esa comprobación.
- **Cuentas temporales — IMPLEMENTADO:** 7 días por defecto y máximo de 30 días
  desde la creación, configurables con `TEMP_ACCOUNT_DEFAULT_DAYS` y
  `TEMP_ACCOUNT_MAX_DAYS` (enteros de 1 a 365; por defecto ≤ máximo). Las creadas
  como temporales conservan vencimiento obligatorio; ampliarlo no reinicia el
  plazo desde su creación. La aplicación no impone una única cuenta por rol.
- **Autor del primer cambio a En proceso — PENDIENTE:** precisar cómo se cuenta
  exactamente esa primera vez cuando el cambio lo hace alguien distinto del
  agente asignado. No se da por decidido si ese cambio acredita la primera
  respuesta o qué atribución se utiliza.
- **Planificación del historial:** HU-02-01 y HU-02-02 ya están en Sprint 3 y
  contemplan registrar cambios y actividades. HU-02-09 y HU-04-04 no tienen
  sprint asignado en el MVP actual. Antes de programar HU-04-04 debe revisarse
  la atribución y el cálculo; el historial estructurado ya existe. No se movieron historias ni se
  amplió el MVP.
- **Referencia pública — CONFIRMADO 6-nov-2026:** se presenta `TK-000123` y
  se conserva el número completo a partir de `TK-1000000`. El ID interno se usa
  en las rutas; no se reinicia la secuencia ni se cambian IDs. La POC de Telegram
  acepta el mismo formato mínimo, sin comprobar que el ticket exista.

La autenticación local, la matriz de permisos del núcleo actual y los tiempos
de sesión ya están implementados; no son decisiones abiertas. Los demás
pendientes de los documentos de requerimientos siguen abiertos:
valores y reglas de SLA, permisos no cerrados aquí, condiciones de aprobación,
retención y recuperación, entre otros. Cerrar S0-08 no los da por resueltos.


## Asignación y actividad · 6-nov-2026

Supervisor y administrador asignan/reasignan/desasignan en Creado, En proceso o
En espera. Un agente solo se asigna a sí mismo si está libre; no toma casos de
otro agente ni desasigna. Destinos nuevos: rol agente, activo y no vencido;
bloqueo de login no elimina asignabilidad. No se borran asignaciones históricas
por desactivar o vencer una cuenta.

El historial guarda actor, fecha y datos estructurados anteriores/nuevos.
Para tickets anteriores solo se recuperó la creación, sin inventar transiciones.
El cálculo de primera respuesta sigue fuera de alcance, aunque ya hay historial.
Prioridad manual implementada el 15-nov-2026: baja/media/alta/urgente, default media.
La cambia agente asignado, supervisor o administrador; el propietario no gana
permiso y Cerrado/Cancelado no se editan. Se admite en Resuelto, sin automatismos,
SLA, escalamiento o notificaciones. Listado, filtro, detalle, actividad y auditoría
conservan la prioridad. Reemplaza la restricción inicial al supervisor.
