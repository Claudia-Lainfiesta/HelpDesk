# Reportes

`/reportes` está disponible para supervisor y administrador. La navegación y
las guardas conservan esa regla y el backend autoriza todas las consultas.
Solicitante y agente son redirigidos a `/sin-permiso`. Se necesita una contraseña
definitiva, igual que en el resto de pantallas autenticadas.

La pantalla consulta PostgreSQL mediante `ReportesApi`, sin datos simulados.
Consume las seis consultas de métricas y `/api/reports/options`; este último
permite al supervisor elegir categorías y agentes históricos sin acceder a la
administración de usuarios. Véase el [contrato backend](../../backend/docs/reports.md).

## Filtros y fechas

Ofrece 7, 30 y 90 días, incluyendo hoy, o Personalizado. Por defecto son 30 días.
Desde/Hasta están siempre visibles y editar una fecha selecciona Personalizado.
La categoría incluye inactivas y el agente incluye históricos/inactivos, indicados
en las opciones. «Aplicar filtros» valida y evita consultas intermedias mientras
se eligen fechas o selectores. Máximo 365 días, fechas reales y Desde <= Hasta.

La URL conserva `range`, `from`, `to`, `categoryId` y `agentId`, con fechas legibles
`YYYY-MM-DD`. Por ejemplo:

```text
/reportes?range=personalizado&from=2026-10-17&to=2026-11-15&categoryId=4&agentId=7
```

Sin fechas en URL se calcula el rango rápido respecto de hoy. Al aplicar se
incluyen ambas fechas para conservar el período concreto al recargar/compartir.
Parámetros temporales inválidos en un enlace se normalizan al rango predeterminado
de su selección. IDs sintácticamente válidos pero inexistentes son rechazados por
la API; se pueden quitar desde los filtros.

Las fechas son inclusivas en la zona local del navegador. Para la API se convierten
ambas medianoches locales a UTC: Desde al comienzo, Hasta al final de su día.
No se suma una duración fija de 24 horas. También se envía la zona IANA para
agrupar la tendencia por calendario local, incluidos cambios de horario.

## Lectura de los resultados

Siete tarjetas presentan creados, resueltos, cerrados, cancelados, pendientes
actuales, tiempo medio de resolución y tiempo medio de cierre. Los volúmenes
usan la fecha de su evento; los promedios van desde creación hasta la resolución
vigente o cierre del período. `null` se muestra como «Sin datos». Se redondea a
minutos y se expresa como `2 h 35 min` o `1 d 4 h`.

Pendientes es una fotografía actual, independiente del rango, con categoría/agente
aplicados. Incluye Resuelto hasta su cierre. Por eso puede haber pendientes en un
período sin creaciones ni otros eventos.

- **Estado y prioridad:** barras con etiqueta y cantidad, incluyendo ceros. Reflejan
  atributos actuales de los tickets creados en el rango.
- **Categoría:** misma cohorte, orden descendente. Hasta diez categorías y Otras
  con la suma restante; inactivas identificadas.
- **Evolución:** tabla con barras comparables y valores de creados, resueltos,
  cerrados y cancelados por su fecha propia. Día hasta 31 días; semana (lunes)
  hasta 120; después mes. Incluye ceros. Fechas en español, agrupadas en la zona
  indicada. Primer/último período pueden ser parciales.
- **Actividad por agente:** nombre, carga actual no terminal, resueltos/cerrados
  en rango y media de resolución. Orden por resueltos descendente, después carga.
  Incluye inactivos con datos. No representa un ranking de calidad del trabajo.

`agentId` y la tabla usan la asignación actual: no reconstruyen quién era agente
al resolver/cerrar. Se usa `resolved_at` vigente tras reaperturas, sin reconstruir
la primera resolución. No hay SLA ni métricas de Telegram/notas.

## Estados, accesibilidad y diseño

La carga es agregada y paralela; cambiar la URL cancela solicitudes obsoletas.
Un fallo presenta un solo mensaje «No fue posible cargar los reportes.» y
«Reintentar». Sin eventos se explica la ausencia de datos y se conserva el
snapshot actual. Si no hubo ningún evento, se omiten los gráficos vacíos y se conserva la carga
actual por agente. Los promedios sin datos se presentan explícitamente.

No se añade una librería gráfica: HTML semántico, listas con cantidades y tablas
con encabezados y captions constituyen también la alternativa textual. Las
barras decorativas tienen `aria-hidden`; nada depende solo del color. Formularios
con etiquetas enlazadas y foco global visible. Evolución y Actividad por agente
usan tablas adaptables con un solo conjunto de datos: bajo `lg` (1024 px), cada
fila se apila con su fecha o agente y una rejilla de métricas etiquetadas; desde
`lg` vuelve la tabla. Ningún bloque requiere desplazamiento horizontal.
Los encabezados y captions siguen disponibles para lectores de pantalla. Los
filtros se apilan en móvil y los siete KPIs ocupan una columna, dos desde `sm`
y cuatro desde `lg`. Los nombres largos envuelven sin cortar información. No se añaden animaciones.

Se reutilizan `app-tarjeta`, `app-boton`, `app-selector`, `app-campo-fecha` (ahora
admite `tipo="date"`, conservando `datetime-local` por defecto) y `app-alerta`.
`app-barras-reporte` es local a esta funcionalidad. Colores: tokens de estado;
prioridad baja/info, media/estado-creado, alta/aviso y urgente/peligro; categorías
con primario. No hay colores nuevos, almacenamiento local ni datos sensibles.

`npm run check` cubre servicio HTTP, fechas/duraciones, roles, carga, rangos,
URL, filtros, cancelación de consultas, KPIs, barras, tendencia, agentes,
vacío y reintento. Las pruebas frontend no necesitan red ni backend.

## Exportar CSV

«Exportar CSV», junto a «Aplicar filtros», descarga mediante Blob sin abrir otra
pestaña. Solo supervisor/administrador pueden abrir la pantalla y la API vuelve a
autorizarlos. Se exporta la **vista aplicada**, no cambios pendientes del formulario.
Durante la descarga muestra «Exportando...» y bloquea envíos duplicados. Un fallo
muestra el toast «No fue posible exportar el reporte.» sin perder las métricas.
El ObjectURL se libera después de iniciar la descarga; el nombre proviene del
Content-Disposition validado, con respaldo `helpdesk-reporte.csv`.

Incluye tickets creados en el rango con categoría/agente actuales: coincide con
la cohorte de distribuciones, no necesariamente con totales de resolución/cierre
ni pendientes actuales. Trece columnas operativas; fechas explícitas en UTC,
duraciones legibles, BOM UTF-8 y defensa contra fórmulas. Sin datos descarga solo
encabezados. No exporta correos, descripción, notas ni imágenes. Véase el
[contrato CSV](../../backend/docs/reports.md#exportación-csv).

Las descargas protegidas conservan el manejo de sesión: el interceptor interpreta
errores JSON aunque HttpClient los reciba como Blob, incluyendo cambio obligatorio
de contraseña.
