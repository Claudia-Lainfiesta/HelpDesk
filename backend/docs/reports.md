# Reportes operativos

Solo supervisor y administrador, con sesión válida y contraseña definitiva.
Agente y solicitante reciben 403 `FORBIDDEN`; sin sesión, 401. Todas las rutas
son GET, devuelven JSON (CSV en export.csv) y `Cache-Control: no-store`. No modifican tickets,
actividad, notas ni auditoría. La validación habitual de sesión sigue vigente.

## Endpoints

| Método | Ruta                       | Respuesta                                                                                                                   |
| ------ | -------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/reports/summary`     | `{ range, filters, kpis }`                                                                                                  |
| GET    | `/api/reports/by-status`   | `{ items: [{ status, count }] }`                                                                                            |
| GET    | `/api/reports/by-priority` | `{ items: [{ priority, count }] }`                                                                                          |
| GET    | `/api/reports/by-category` | `{ items: [{ category: { id, name, isActive }, count }] }`                                                                  |
| GET    | `/api/reports/trend`       | `{ granularity, timeZone, items: [{ bucket, created, resolved, closed, canceled }] }`                                       |
| GET    | `/api/reports/by-agent`    | `{ items: [{ agent: { id, fullName, isActive }, assignedNow, resolvedInRange, closedInRange, averageResolutionMinutes }] }` |
| GET    | `/api/reports/options`     | `{ categories: [{ id, name, isActive }], agents: [{ id, fullName, isActive }] }`                                            |

Las seis consultas de métricas comparten `from`, `to`, `timeZone`, `categoryId`
y `agentId`. Las opciones no necesitan filtros y no conceden acceso a Usuarios.
Incluyen categorías activas/inactivas, usuarios con rol agente y antiguos
responsables que todavía figuren como asignados en tickets. No incluyen correos.
Los IDs se representan como strings para conservar la precisión de bigint.

## Fechas y filtros

La interfaz convierte las fechas locales inclusivas a instantes ISO UTC con
milisegundos y `Z`. Envía también la zona IANA del navegador, por ejemplo:

```http
GET /api/reports/summary?from=2026-10-17T06:00:00.000Z&to=2026-11-16T05:59:59.999Z&timeZone=America%2FGuatemala
```

La UI interpreta ese ejemplo como 17 de octubre a 15 de noviembre incluidos.
No se fija un desfase: las medianoches se calculan en la zona del navegador,
incluidos sus cambios de horario. `timeZone` se usa para contar días civiles y
agrupar los buckets; no cambia los instantes UTC enviados.

La API también admite fechas `YYYY-MM-DD`, interpretadas explícitamente como
días UTC completos. Sin fechas, utiliza hoy UTC y los 29 días anteriores. Sin
`timeZone`, utiliza UTC. Es obligatorio enviar ambas fechas o ninguna, con orden
válido y un máximo de 365 días civiles. Fechas imposibles, zonas desconocidas,
campos inesperados, IDs inválidos o filtros inexistentes responden 400
`INVALID_INPUT`. Para consultas desde el navegador se recomienda siempre el
contrato ISO UTC más zona, que evita ambigüedad entre días locales y UTC.

`from` es inclusivo. `to` incluye todo su último milisegundo: internamente se
consulta `>= from AND < to + 1 millisecond`, incluyendo la precisión de
microsegundos de PostgreSQL. No se pierde un evento a las 23:59:59.999500.

`categoryId` admite categorías inactivas. `agentId` compara con
`assigned_agent_id` **actual**, incluso en métricas históricas. Ambos filtros
afectan todas las métricas y los snapshots; omitirlos incluye todos los tickets.

## Métricas

| Campo                      | Regla                                                                              |
| -------------------------- | ---------------------------------------------------------------------------------- |
| `created`                  | `created_at` dentro del rango                                                      |
| `resolved`                 | `resolved_at` vigente dentro del rango                                             |
| `closed`                   | `closed_at` dentro del rango                                                       |
| `canceled`                 | `canceled_at` dentro del rango                                                     |
| `pendingNow`               | Estado actual distinto de cerrado/cancelado, sin límite temporal; incluye resuelto |
| `averageResolutionMinutes` | Media de `resolved_at - created_at` para resoluciones vigentes dentro del rango    |
| `averageCloseMinutes`      | Media de `closed_at - created_at` para cierres dentro del rango                    |

Los promedios son minutos decimales, o `null` cuando no hay observaciones.
No se limita todo a la cohorte creada en el período: un ticket creado antes
puede aportar una resolución o cierre en el rango. El snapshot puede ser mayor
que cero aunque no haya eventos en el período seleccionado.

Estado y prioridad agrupan la **cohorte creada en el rango** por sus valores
actuales. Se incluyen los seis estados y cuatro prioridades aun con cero.
Categoría usa esa misma cohorte; incluye inactivas con tickets, omite ceros y
ordena por cantidad descendente y nombre ascendente.

Tendencia usa `created_at`, `resolved_at`, `closed_at` y `canceled_at` para sus
respectivas series. PostgreSQL genera los buckets vacíos con cero: hasta 31 días,
día; de 32 a 120, semana que empieza en lunes; más de 120, mes. `bucket` es la
fecha local de inicio del día/semana/mes. Los extremos pueden ser parciales y la
primera semana puede empezar antes de Desde, pero solo cuenta eventos dentro
del rango. La agrupación respeta `timeZone`, también en jornadas de 23/25 horas.

Por agente: `assignedNow` cuenta asignados actuales no terminales de cualquier
fecha; `resolvedInRange`, `closedInRange` y el promedio usan fechas de evento y
asignación actual. Aparecen agentes inactivos con datos. Se incluye quien tenga
carga actual o tickets con creación/resolución/cierre/cancelación en el rango;
se omiten agentes sin datos. Orden: resueltos descendente, carga descendente,
nombre e ID para desempatar.

## Permisos y límites

| Acción                            | Solicitante | Agente | Supervisor | Administrador |
| --------------------------------- | ----------- | ------ | ---------- | ------------- |
| Consultar reportes y sus opciones | No          | No     | Sí         | Sí            |

- No hay SLA, primera respuesta, objetivos ni clasificación competitiva.
- No se reconstruye el responsable histórico desde `ticket_events`.
- Una reapertura puede borrar la resolución anterior: se usa `resolved_at` vigente,
  no la primera resolución histórica. Las cifras pueden cambiar tras reasignar o reabrir.
- Telegram y notas no forman parte de métricas de productividad.
- No hay escrituras, tablas estadísticas ni filtros persistidos en DB.
- Cada endpoint consulta en una transacción de solo lectura con snapshot consistente;
  distintas peticiones pueden observar cambios concurrentes entre ellas.

Las agregaciones se ejecutan en PostgreSQL con parámetros; no se cargan tickets
individuales en Node para las métricas. El CSV sí carga únicamente las filas del rango filtrado. Se conservan los índices de creación, categoría y agente
existentes. No se añaden índices especulativos sobre las otras fechas para el
volumen local; conviene medir planes y tiempos si el volumen crece.

Las pruebas crean un esquema privado, aplican las migraciones y usan fechas
fijas para límites, promedios, filtros, snapshots, roles, granularidades y DST.
No modifican los datos de desarrollo. Necesitan `DATABASE_URL` exportada para
correr integración; sin ella se omiten con un mensaje explícito.

## Exportación CSV

`GET /api/reports/export.csv` requiere supervisor o administrador; comparte exactamente
la validación `from`, `to`, `timeZone`, `categoryId` y `agentId` de reportes (máximo 365 días).
Lee en transacción de solo lectura. Incluye una fila por ticket **creado en el rango**,
con categoría y asignación actuales, igual que las distribuciones. No es la unión de
creaciones/resoluciones/cierres del período ni el snapshot de pendientes. Orden por
creación descendente e ID para desempatar. No requiere migración ni índices nuevos.

Columnas: Ticket, Asunto, Categoría, Estado, Prioridad, Solicitante, Agente asignado,
Fecha de creación, Fecha de resolución, Fecha de cierre, Fecha de cancelación,
Tiempo de resolución y Tiempo de cierre. Estados/prioridades llevan etiquetas en
español. Fechas `YYYY-MM-DD HH:mm:ss UTC`, con UTC explícito en cada valor;
duraciones redondeadas a minutos (`2 h 35 min`, `1 d 1 h`), vacío si no hay fecha.
No contiene descripción, correos, notas, notificaciones, usernames, imágenes,
nombres de adjuntos ni IDs internos.

Respuesta `text/csv; charset=utf-8`, `Cache-Control: no-store`, `nosniff` y
`Content-Disposition: attachment; filename="helpdesk-reporte-2026-10-18-a-2026-11-16.csv"`.
El nombre usa las fechas civiles de `timeZone`; los valores dentro del archivo
siempre indican UTC. UTF-8 con BOM para hojas de cálculo, separador coma, CRLF
y todas las celdas entre comillas; comillas internas duplicadas, saltos conservados.
Se antepone apóstrofo a celdas que empiezan con `=`, `+`, `-` o `@`, también tras
espacios, controles o marcas Unicode invisibles. Esto neutraliza fórmulas sin
modificar los datos almacenados. Sin datos se devuelve solo el encabezado.

Generación en memoria proporcional a los tickets del rango filtrado mediante SQL
parametrizado; no hay exportación Excel/PDF ni descarga de todos los tickets sin filtro.
La exportación y los reportes son peticiones distintas: cambios concurrentes pueden
hacer variar sus resultados. Pruebas cubren roles, validación, límites de fecha,
filtros combinados, privacidad, formato, acentos y neutralización de fórmulas.
