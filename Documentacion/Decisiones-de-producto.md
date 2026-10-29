# Decisiones de producto de HelpDesk

El 29-oct-2026 el equipo, haciendo el papel del cliente, cerró las decisiones
de S0-08. Este registro recoge lo acordado; los puntos que todavía necesitan
una decisión están separados al final.

| Fecha | Decisión | Motivo breve | Historias o épicas afectadas |
| --- | --- | --- | --- |
| 29-oct-2026 | La primera respuesta es el primer cambio del ticket a **En proceso**. Se calcula desde el historial de cambios de estado, que registra quién cambió, de cuál a cuál y cuándo; no se usa una columna aparte. Solo cuenta la primera vez, aunque el ticket vuelva a otro estado y después a En proceso. No cuentan notificaciones automáticas, notas internas ni mensajes de Telegram. | Medir un evento trazable del caso sin depender del canal de conversación. | EP-02, EP-04 y EP-08; HU-02-01, HU-02-09, HU-04-04 y HU-08-05; D-26. |
| 29-oct-2026 | Los seis estados son **Creado, En proceso, En espera, Resuelto, Cerrado y Cancelado**. El estado se elige explícitamente, sin restricciones de transición. El agente cierra: Cerrado significa que terminó con éxito. Solo el supervisor cancela, con motivo: Cancelado significa que se decidió no continuar. El solicitante no cancela directamente. | Distinguir la atención exitosa de una interrupción y dejar claras las responsabilidades. | EP-02 y EP-09; HU-02-01, HU-02-05, HU-02-06, HU-02-07 y HU-09-02; D-10, D-13 y D-14. |
| 29-oct-2026 | El supervisor ajusta las prioridades y concede las excepciones de tiempo de SLA. | Concentrar estas decisiones y su justificación en la supervisión del servicio. | EP-04; HU-04-02, HU-04-03 y HU-04-06; D-23 y D-27. |
| 29-oct-2026 | El supervisor revisa los artículos de conocimiento y el administrador los publica. | Separar la revisión del contenido de su publicación. | EP-07; HU-07-04 y HU-07-05; D-48. |
| 29-oct-2026 | Las funciones técnicas de auditoría y respaldo corresponden al supervisor y al administrador. Por seguridad, en la práctica las realiza un tercero externo que acude presencialmente a la empresa, entra al sistema localmente y usa las credenciales de los usuarios para comprobar su comportamiento. Ese auditor no tiene cuenta propia ni es un quinto rol. | Contar con una comprobación externa y presencial; las implicaciones de usar credenciales ajenas se señalan debajo. | EP-05 y EP-10; HU-10-06, HU-10-07, HU-10-08 y HU-10-09; D-74 y D-75. |
| 29-oct-2026 | Cada usuario tiene **un solo rol a la vez**: solicitante, agente, supervisor o administrador. | Evitar combinaciones simultáneas y mantener claro el rol vigente. | EP-05; HU-05-05 y HU-05-07; D-35. |
| 29-oct-2026 | La referencia del ticket tiene el formato **`TK-XXXXXX`**, con seis dígitos. | Reconocer y compartir una referencia uniforme del caso. | EP-01 y EP-02; HU-01-01. |
| 29-oct-2026 | La plataforma será **web**. | Mantener la modalidad acordada para el proyecto actual. | S0-01, S0-08 y los recorridos del portal y de atención. |

## Pendientes y consideraciones

- **Validación real de Telegram — PENDIENTE:** probar el relevo en ambos
  sentidos con dos cuentas reales. La prueba de concepto no se ha validado
  con una segunda cuenta real; las pruebas automáticas con pasarelas falsas
  no sustituyen esa comprobación.
- **Credenciales del auditor:** con el acuerdo actual, las acciones del tercero
  quedarían registradas a nombre de empleados reales. Además, habría que pedir
  sus contraseñas o restablecerlas; no se presupone que el sistema pueda
  recuperarlas en texto legible. **Alternativa PENDIENTE de decidir:** que el
  administrador cree cuentas temporales de auditoría, una por cada rol y con
  vencimiento. No está aprobada, no se crean esas cuentas y no se agrega un rol.
- **Autor del primer cambio a En proceso — PENDIENTE:** precisar cómo se cuenta
  exactamente esa primera vez cuando el cambio lo hace alguien distinto del
  agente asignado. No se da por decidido si ese cambio acredita la primera
  respuesta o qué atribución se utiliza.
- **Planificación del historial:** HU-02-01 y HU-02-02 ya están en Sprint 3 y
  contemplan registrar cambios y actividades. HU-02-09 y HU-04-04 no tienen
  sprint asignado en el MVP actual. Antes de programar HU-04-04 debe revisarse
  la cobertura del historial que necesita; no se movieron historias ni se
  amplió el MVP.
- **Referencia y POC existente:** la documentación técnica de Telegram describe
  una validación de al menos seis dígitos, mientras que el formato de producto
  acordado es de seis. Esa diferencia queda señalada para la revisión técnica;
  este cambio documental no modifica frontend, backend ni la descripción de
  lo que realmente hace la POC.

Los demás pendientes de los documentos de requerimientos siguen abiertos:
valores y reglas de SLA, permisos no cerrados aquí, condiciones de aprobación,
retención y recuperación, entre otros. Cerrar S0-08 no los da por resueltos.
