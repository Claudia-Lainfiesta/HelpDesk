# Épicas del sistema HelpDesk interno

## 1. Propósito y alcance

El sistema centralizará la atención de solicitudes de soporte de los solicitantes de una sola empresa. Permitirá registrar, asignar, atender y resolver tickets con trazabilidad, controlar tiempos de atención y generar información para mejorar el servicio.

Las cuentas pertenecen a empleados de la empresa y cada usuario tiene un solo rol a la vez: solicitante, agente de soporte, supervisor o administrador. No se contempla atención a clientes, proveedores ni usuarios de otras empresas. Para la auditoría, un tercero externo acude presencialmente y usa localmente las credenciales de los usuarios; no tiene cuenta propia ni constituye un quinto rol.

La comunicación directa entre solicitantes y agentes se realizará mediante Telegram en ambas direcciones, integrada con los tickets del HelpDesk. Las notificaciones importantes y relevantes se enviarán tanto en la aplicación principal como por Telegram a los destinatarios autorizados. Telegram es un canal tecnológico externo; su uso no incorpora usuarios externos a la empresa.

Este documento propone diez épicas principales a partir de las once originales. Las descripciones establecen capacidades y límites para descomponerlas posteriormente en historias de usuario y criterios de aceptación. El canal de comunicación ya está definido; las reglas específicas de integración, el catálogo de eventos relevantes y los valores de SLA deberán validarse con los responsables del servicio.

## 2. Crítica de las épicas originales

La propuesta original cubre las capacidades principales de un HelpDesk, pero mezcla experiencias de usuario, procesos operativos y requisitos transversales. Esto es válido si se definen sus límites; de lo contrario, puede producir historias duplicadas y responsabilidades ambiguas.

| N.º | Épica original | Crítica y ajuste propuesto |
| --- | --- | --- |
| 1 | Captura de solicitudes multicanal | “Multicanal” mezcla la entrada de solicitudes con la comunicación posterior. Se fusiona con el portal del solicitante para el registro y consulta. Telegram se integra para la conversación bidireccional y las notificaciones; esto no implica crear tickets desde Telegram. |
| 2 | Portal del solicitante | Describe una interfaz, pero debe expresar el valor para el solicitante: registrar solicitudes y consultar su atención. Se integra con la captura para abarcar esa experiencia completa. |
| 3 | Ciclo de vida y seguimiento del ticket | Es el núcleo operativo y debe conservarse. Necesita distinguir estados, transiciones e historial de las reglas de asignación, los SLA y el envío de notificaciones. |
| 4 | Asignación y distribución | Es esencial para que cada solicitud tenga un responsable. Debe precisar la relación entre equipos, niveles y agentes, sin asumir algoritmos avanzados de distribución desde el inicio. |
| 5 | Prioridades, SLA y escalamiento | Agrupa capacidades relacionadas y conviene mantenerlas juntas. Faltan definiciones de impacto, urgencia, resolución, horarios y pausas; la primera respuesta es el primer cambio a «En proceso», obtenido del historial de estados. Un cambio de prioridad no debe borrar un incumplimiento previo. |
| 6 | Usuarios, roles y accesos | Es necesaria, pero debe centrarse en usuarios y permisos internos. Se debe diferenciar la administración de identidades y autorizaciones de los controles técnicos de seguridad de la épica transversal. |
| 7 | Notificaciones y comunicación | Debe distinguir conversación bidireccional por Telegram, notas internas y avisos automáticos. Las notificaciones relevantes requieren envío por la aplicación y por Telegram, con trazabilidad por canal, control de destinatarios y manejo de fallos. Las notas internas permanecen restringidas dentro del HelpDesk. |
| 8 | Base de conocimiento | Aporta autoservicio, pero no debe limitarse a almacenar artículos. Necesita búsqueda, revisión, publicación y mantenimiento del contenido para evitar respuestas obsoletas. |
| 9 | Reportes, dashboards y satisfacción | Reúne análisis operativo y percepción del solicitante, ambos útiles para mejorar el servicio. Debe definir métricas y evitar interpretar una encuesta sin respuesta como satisfacción positiva o negativa. |
| 10 | Administración y configuración | Es necesaria, pero demasiado amplia si se convierte en un contenedor de cualquier función administrativa. Debe limitarse a parámetros y catálogos; cada módulo conserva la ejecución de sus reglas. |
| 11 | Seguridad, auditoría y respaldos (transversal) | Es esencial, aunque combina controles de calidad con funciones operativas. Se mantiene con entregables verificables y aplicación transversal; no debe relegarse a una fase final ni confundirse con el historial visible del ticket. |

### Decisión de consolidación

Se fusionan **Captura de solicitudes multicanal** y **Portal del solicitante** en **Registro de solicitudes y portal del solicitante**. El registro es la entrada al servicio y el portal es el espacio natural para que el solicitante consulte y amplíe sus solicitudes. La fusión reduce duplicidad sin eliminar capacidades de negocio.

Las otras nueve épicas se conservan con nombres y límites más precisos. Seguridad no se elimina para alcanzar el número solicitado: se mantiene explícita por su importancia para la confidencialidad, la trazabilidad y la recuperación de la información.

Se mantiene el registro y seguimiento de solicitudes mediante el portal y se establece Telegram como canal de conversación directa solicitante-agente y agente-solicitante. La integración deberá asociar la comunicación con el ticket correspondiente y sin guardar el contenido de los mensajes; el HelpDesk seguirá siendo el registro central del caso. Las notificaciones importantes y relevantes se enviarán por ambos canales: aplicación principal y Telegram. Las notas internas se gestionarán dentro del HelpDesk y no se reenviarán al solicitante. La creación de tickets desde Telegram no forma parte del alcance definido; requeriría una ampliación expresa.

## 3. Las diez épicas propuestas

| ID | Épica | Correspondencia original |
| --- | --- | --- |
| EP-01 | Registro de solicitudes y portal del solicitante | 1 y 2 |
| EP-02 | Gestión del ciclo de vida y seguimiento del ticket | 3 |
| EP-03 | Asignación y distribución del trabajo | 4 |
| EP-04 | Gestión de prioridades, SLA y escalamiento | 5 |
| EP-05 | Gestión de usuarios, roles y accesos | 6 |
| EP-06 | Comunicación bidireccional por Telegram y notificaciones | 7 |
| EP-07 | Base de conocimiento y autoservicio | 8 |
| EP-08 | Reportes, tableros y satisfacción del solicitante | 9 |
| EP-09 | Administración y configuración del servicio | 10 |
| EP-10 | Seguridad, auditoría y recuperación de la información | 11 |

### EP-01. Registro de solicitudes y portal del solicitante

**Descripción:** Permitir que los solicitantes registren sus necesidades de soporte en un punto central y consulten el avance de sus solicitudes durante toda la atención. El portal reunirá los datos necesarios para iniciar un ticket y mostrará información comprensible sobre su estado, responsable y resolución, reduciendo la dependencia de consultas informales al equipo de soporte.

**Actores principales:** Solicitantes; agentes autorizados para registrar solicitudes en nombre de otro solicitante, si se habilita esta opción.

**Papel de cada rol:**

- **Solicitante:** registra sus solicitudes con asunto, descripción, categoría y archivos adjuntos; consulta y filtra solo sus propios tickets, su estado, su responsable y su historial de actividades; lee la solución, pide la reapertura cuando las reglas lo permiten y accede desde el ticket a la conversación por Telegram.
- **Agente:** puede registrar una solicitud en nombre de otro solicitante, únicamente si la empresa habilita esta opción; esto no le da permisos adicionales sobre el ticket.
- **Supervisor y administrador:** no tienen un papel propio en esta épica; ser supervisor o administrador no permite ver los tickets de otros solicitantes.

**Alcance funcional:**

- Registrar solicitudes con asunto, descripción, categoría y archivos adjuntos cuando corresponda.
- Validar los datos requeridos y entregar un identificador único del ticket.
- Consultar y filtrar las solicitudes propias, su estado y la información de atención permitida.
- Consultar la información de atención desde el detalle del ticket.
- Acceder desde el ticket a la conversación de atención por Telegram con una referencia clara al caso, según el mecanismo de integración definido en EP-06.
- Consultar la solución y solicitar una reapertura cuando las reglas del servicio lo permitan.

**Límites:** No permite consultar tickets ajenos sin autorización. La gestión de estados pertenece a EP-02 y la conversación por Telegram y las notificaciones a EP-06. El portal permite registrar y consultar tickets y su historial; no incorpora un chat propio. El registro de nuevas solicitudes se mantiene en el portal.

**Resultado esperado:** El solicitante puede registrar y seguir su solicitud manteniendo una referencia centralizada y trazable en el sistema.

### EP-02. Gestión del ciclo de vida y seguimiento del ticket

**Descripción:** Gestionar cada ticket desde su creación hasta su resolución y cierre, conservando un registro de las acciones realizadas. El sistema organizará el trabajo mediante estados elegidos explícitamente, sin restricciones de transición y con permisos por rol, de modo que los participantes conozcan la situación del caso, las acciones pendientes y la solución aplicada.

**Actores principales:** Agentes de soporte, supervisores y solicitantes en las acciones habilitadas para ellos.

**Papel de cada rol:**

- **Agente:** lleva el ticket desde su registro hasta su resolución: actualiza el estado, registra actividades, pide información al solicitante, deja el caso en espera cuando corresponde, documenta la solución, resuelve y cierra los tickets que terminaron con éxito.
- **Supervisor:** consulta el historial de los casos dentro de su alcance y es el único rol que puede cancelar un ticket, con motivo, cuando se decide no continuar.
- **Solicitante:** aporta la información que se le pide, puede solicitar la reapertura y consulta la solución; no cambia estados.
- **Administrador:** no ejecuta el flujo; los estados y sus permisos se configuran mediante EP-09, sin imponer un recorrido entre estados.

**Alcance funcional:**

- Gestionar los seis estados acordados: Creado, En proceso, En espera, Resuelto, Cerrado y Cancelado. El estado se elige explícitamente, sin restricciones de transición; el agente cierra y solo el supervisor cancela.
- Registrar actividades de atención, cambios relevantes y sus responsables y fechas.
- Documentar la solución antes de resolver el ticket y aplicar las condiciones de cierre.
- Gestionar solicitudes de información, cancelaciones y reaperturas con su justificación.
- Conservar el historial del caso, incluido quién cambió cada estado, de cuál a cuál y cuándo, y mostrar cada información según los permisos del usuario.

**Límites:** Los seis estados y la selección sin restricciones de transición están acordados. EP-09 configura sus permisos; esta épica comprueba los permisos y las condiciones propias de cada acción. El historial aporta la primera entrada en «En proceso» para EP-04, sin una columna aparte de primera respuesta. No calcula SLA ni decide reglas de asignación.

**Resultado esperado:** Cada ticket tiene una situación identificable y una historia de atención que permite reconstruir cómo se resolvió.

### EP-03. Asignación y distribución del trabajo

**Descripción:** Dirigir las solicitudes al equipo, nivel y agente adecuados, manteniendo visible la responsabilidad de atención. Permitirá organizar colas de trabajo y redistribuir casos para evitar solicitudes sin atender o concentraciones de carga que afecten la continuidad del servicio.

**Actores principales:** Agentes de soporte y supervisores.

**Papel de cada rol:**

- **Supervisor:** identifica los tickets sin equipo o sin agente, los asigna, reasigna o transfiere y consulta la carga de trabajo, siempre dentro de su propio alcance.
- **Agente:** consulta las colas que tiene autorizadas y toma tickets de ellas cuando las reglas lo permiten.
- **Solicitante:** puede ver quién atiende su caso, según la información que se le permita conocer.
- **Administrador:** mantiene la pertenencia de agentes y supervisores a equipos (EP-05) y la estructura de equipos y niveles (EP-09); no asigna tickets por ser administrador.

**Alcance funcional:**

- Organizar colas por equipo, categoría o nivel de atención, según la estructura del soporte.
- Asignar tickets a equipos y agentes habilitados para atenderlos.
- Permitir la toma de tickets de una cola cuando el rol y las reglas lo autoricen.
- Reasignar y transferir tickets conservando el motivo y el historial de responsables.
- Identificar tickets sin asignación y consultar la carga de trabajo para apoyar la distribución.
- Aplicar reglas básicas de enrutamiento por categoría o equipo cuando estén configuradas.
- Actualizar los destinatarios de la comunicación por Telegram ante una asignación o transferencia, respetando los permisos vigentes y conservando el historial del ticket.

**Límites:** La asignación inicial y la redistribución operativa pertenecen a esta épica. EP-04 determina cuándo un riesgo o incumplimiento de SLA exige un escalamiento. No se presupone distribución mediante inteligencia artificial ni optimización avanzada.

**Resultado esperado:** Los tickets llegan al equipo adecuado y su responsabilidad permanece identificable durante transferencias y reasignaciones.

### EP-04. Gestión de prioridades, SLA y escalamiento

**Descripción:** Ordenar la atención según la importancia de cada solicitud y controlar los compromisos de tiempo del servicio. El sistema aplicará prioridades y acuerdos de nivel de servicio (SLA), identificará riesgos de atraso y activará el escalamiento correspondiente para facilitar una intervención oportuna.

**Actores principales:** Agentes de soporte, supervisores y administradores responsables de las políticas del servicio.

**Papel de cada rol:**

- **Agente:** atiende sus tickets según la prioridad y los vencimientos de SLA; la primera respuesta se acredita con el primer cambio a «En proceso», calculado desde el historial de estados de EP-02.
- **Supervisor:** identifica los tickets en riesgo o fuera de tiempo, recibe los escalamientos, decide la intervención, ajusta prioridades y concede excepciones de tiempo de SLA.
- **Administrador:** define las prioridades, los SLA, los horarios y las reglas de escalamiento mediante EP-09, con permisos específicos.
- **Solicitante:** no elige la prioridad ni los tiempos de su solicitud.

**Alcance funcional:**

- Determinar la prioridad mediante criterios definidos de impacto y urgencia, con ajustes justificados por el supervisor.
- Calcular los vencimientos de primera respuesta y resolución según el SLA aplicable.
- Considerar horarios laborales, días no laborables y reglas explícitas de pausa y reanudación.
- Identificar tickets próximos a vencer y tickets que incumplieron sus tiempos comprometidos.
- Activar escalamiento hacia supervisores o niveles de atención según las reglas definidas.
- Conservar el historial de prioridad, SLA, pausas e incumplimientos para su revisión.
- Generar avisos relevantes de riesgo, incumplimiento y escalamiento para su envío mediante EP-06 tanto en la aplicación como en Telegram.
- Calcular la primera respuesta a partir del primer cambio a «En proceso» registrado en el historial de estados de EP-02, sin una columna aparte y sin reiniciarla al volver a ese estado. Las notificaciones automáticas, las notas internas y los mensajes de Telegram no cuentan. Queda pendiente precisar cómo se cuenta si el cambio lo hace alguien distinto del agente asignado.

**Límites:** EP-09 administra parámetros y calendarios; esta épica aplica las reglas y mide los tiempos. EP-06 entrega las alertas y EP-03 ejecuta las transferencias que correspondan. Los valores de SLA y el tratamiento de reaperturas o cambios de prioridad quedan pendientes de definición.

**Resultado esperado:** El equipo conoce qué solicitudes requieren atención prioritaria y puede detectar y gestionar atrasos con evidencia verificable.

### EP-05. Gestión de usuarios, roles y accesos

**Descripción:** Administrar la participación de los usuarios en el sistema y las operaciones que pueden realizar. El acceso se basará en responsabilidades internas y alcance de información, permitiendo que cada persona use las funciones necesarias para su trabajo sin acceder a información o acciones que no le correspondan.

**Actores principales:** Administradores; solicitantes, agentes y supervisores como usuarios del sistema.

**Papel de cada rol:**

- **Administrador:** habilita, actualiza y desactiva cuentas, asigna los roles y asocia agentes y supervisores con equipos y niveles; no obtiene por ello acceso a todos los tickets ni puede ampliar sus propios privilegios.
- **Solicitante, agente y supervisor:** inician y cierran sesión, recuperan su acceso y usan solo las funciones y datos que su rol y su relación con cada caso les permiten. Solicitantes y agentes vinculan y administran su identidad de Telegram.

**Alcance funcional:**

- Gestionar altas, actualizaciones y desactivación de cuentas de usuarios.
- Autenticar a los usuarios y gestionar el acceso a sus cuentas.
- Asignar a cada usuario un único rol vigente: solicitante, agente de soporte, supervisor o administrador.
- Asociar agentes y supervisores con equipos y niveles de soporte cuando corresponda.
- Restringir acciones y visibilidad de tickets, reportes, artículos y configuración según permisos.
- Conservar la referencia histórica a usuarios desactivados en los registros existentes.
- Vincular de forma verificable la identidad de Telegram de solicitantes y agentes con su cuenta de usuario, y permitir su actualización o desvinculación controlada.
- Revocar el acceso mediante la integración y los envíos a una identidad desvinculada o desactivada, conservando las referencias históricas.

**Límites:** No incluye registro público ni identidades de organizaciones externas. La integración con un directorio corporativo o inicio de sesión único deberá validarse. EP-10 establece los controles técnicos de protección y auditoría; un rol administrativo no implica acceso indiscriminado al contenido de todos los tickets.

**Resultado esperado:** Cada usuario accede únicamente a las funciones y datos autorizados, y los cambios de personal no destruyen la trazabilidad.

### EP-06. Comunicación bidireccional por Telegram y notificaciones

**Descripción:** Integrar Telegram como canal de comunicación directa en ambas direcciones entre el solicitante y el agente de soporte, asociando la conversación con el ticket correspondiente. Gestionar las notificaciones importantes y relevantes en la aplicación principal y en Telegram, de manera que los participantes reciban los avisos en ambos canales. Mantener las notas internas dentro del HelpDesk con acceso exclusivo del personal autorizado.

**Actores principales:** Solicitantes, agentes de soporte y supervisores.

**Papel de cada rol:**

- **Solicitante y agente:** conversan en ambas direcciones por Telegram, con el ticket identificado, y comparten archivos de atención; ambos reciben las notificaciones relevantes.
- **Agente y supervisor:** registran notas internas, que permanecen dentro del HelpDesk, y reciben los avisos de los eventos que les corresponden.
- **Supervisor y personal autorizado:** dan seguimiento a los envíos fallidos o pendientes, sin acceso por ello al contenido de los casos; quién tiene este papel queda por definir.
- **Administrador:** configura la integración, las plantillas y el catálogo de eventos mediante EP-09; no participa en las conversaciones.

**Alcance funcional:**

- Permitir el intercambio bidireccional de mensajes y archivos de atención por Telegram entre solicitantes y agentes vinculados y autorizados para el caso.
- Identificar el ticket al que corresponde cada intercambio, incluso cuando un solicitante tenga varios casos abiertos; solicitar su identificación cuando sea ambigua antes de incorporarlo o dirigirlo a un caso.
- Registrar notas internas visibles únicamente para el personal de soporte autorizado.
- Notificar eventos importantes y relevantes, como registro, asignación o reasignación, respuesta que requiera atención, cambio de estado, resolución, riesgo de incumplimiento y escalamiento. El catálogo y sus destinatarios se precisarán en EP-09.
- Determinar destinatarios según el evento, su relación con el ticket y sus permisos.
- Enviar cada notificación clasificada como importante o relevante tanto en la aplicación como por Telegram, conservando la referencia al mismo evento y ticket.
- Registrar por canal los estados de procesamiento y envío, los intentos y los fallos, sin interpretar un envío aceptado como confirmación de lectura del solicitante, agente o supervisor destinatario.
- Gestionar reintentos y evitar duplicados por reprocesamiento de notificaciones; la copia requerida en cada canal no constituye un duplicado indebido.
- Mantener las notificaciones de la aplicación disponibles cuando falle Telegram y dejar visible el envío pendiente o fallido para su recuperación. La ausencia de una vinculación válida se tratará como incidencia de entrega, sin marcar el envío por Telegram como completado.

**Integración por definir:** El mecanismo concreto de conversación en Telegram, la vinculación de cuentas, la selección de tickets y el tratamiento de archivos deberán detallarse y validarse técnicamente. La solución deberá permitir ambas direcciones sin conservar un historial de mensajes en el HelpDesk; no se presupone acceso a conversaciones privadas ajenas al mecanismo integrado.

**Límites:** Los módulos de tickets, asignación y SLA originan los eventos. EP-05 administra la vinculación de identidades y EP-09 las plantillas y reglas de notificación. Las notas internas no se publican en Telegram. La conversación no modifica automáticamente estados, responsables ni prioridades del ticket; esos cambios se realizan mediante las funciones autorizadas del HelpDesk. No se incluye un chat propio de la aplicación ni la creación de tickets desde Telegram.

**Resultado esperado:** Solicitante y agente se comunican en ambas direcciones por Telegram sin conservar un historial de mensajes, y las notificaciones relevantes se envían por la aplicación y Telegram con seguimiento independiente de fallos y reintentos.

### EP-07. Base de conocimiento y autoservicio

**Descripción:** Proporcionar a los solicitantes información confiable para resolver dudas frecuentes y reutilizar soluciones documentadas. El equipo de soporte podrá transformar experiencias de atención en artículos revisados, facilitando el autoservicio y la consistencia de las respuestas.

**Actores principales:** Solicitantes consultantes, agentes autores y responsables de revisión o publicación.

**Papel de cada rol:**

- **Solicitante:** busca y consulta los artículos que tiene permitidos para resolver dudas por su cuenta.
- **Agente:** redacta borradores, prepara artículos a partir de soluciones de soporte sin incluir datos sensibles y relaciona artículos con tickets.
- **Revisión:** el supervisor revisa los artículos antes de su publicación.
- **Publicación:** el administrador publica los artículos revisados por el supervisor.

**Alcance funcional:**

- Crear y editar artículos con instrucciones, soluciones y preguntas frecuentes.
- Clasificar y buscar contenido por título, categoría o palabras clave.
- Gestionar borradores, revisión, publicación y retiro de contenido obsoleto.
- Relacionar artículos con tickets para facilitar la consulta y reutilización de soluciones.
- Controlar la visibilidad de artículos generales para solicitantes y contenido restringido al soporte.
- Registrar responsables y fechas de actualización para apoyar el mantenimiento del conocimiento.

**Límites:** No incluye un portal público ni generación automática de respuestas. La publicación de una solución debe excluir información personal o sensible del ticket de origen.

**Resultado esperado:** Los solicitantes encuentran respuestas útiles por su cuenta y el soporte reutiliza conocimiento revisado.

### EP-08. Reportes, tableros y satisfacción del solicitante

**Descripción:** Ofrecer visibilidad sobre la demanda, la carga de trabajo, los tiempos de atención y la percepción de los solicitantes. Los responsables del soporte podrán identificar acumulaciones, incumplimientos y oportunidades de mejora mediante indicadores calculados a partir de datos trazables.

**Actores principales:** Supervisores, responsables del servicio y solicitantes que respondan encuestas.

**Papel de cada rol:**

- **Supervisor:** consulta los tableros, la demanda, la carga, los tiempos y el cumplimiento de SLA dentro de su alcance, y la satisfacción de los solicitantes.
- **Solicitante:** responde de forma voluntaria la valoración de la atención; no responde por otras personas.
- **Agente y administrador:** no consultan reportes por el solo hecho de su rol; la exportación y el detalle requieren permisos específicos.

**Alcance funcional:**

- Consultar indicadores de tickets recibidos, pendientes, resueltos, cerrados y reabiertos.
- Analizar carga por equipo o agente, categorías frecuentes y evolución de la demanda.
- Medir tiempos de primera respuesta y resolución, así como cumplimiento e incumplimiento de SLA.
- Obtener la primera respuesta del primer cambio a «En proceso» en el historial de estados de EP-02, según EP-04. No se reinicia con entradas posteriores ni depende de una columna aparte; las notificaciones automáticas, notas internas y mensajes de Telegram no cuentan.
- Filtrar información por período, categoría, prioridad, equipo y otros criterios autorizados.
- Solicitar una valoración voluntaria de la atención al concluir el caso, con comentario opcional.
- Presentar resultados de satisfacción junto con el volumen y la tasa de respuesta de las encuestas.
- Exportar reportes según permisos de acceso.

**Límites:** Deben definirse fórmulas, períodos y tratamiento de pausas y reaperturas antes de implementar indicadores. Las encuestas sin respuesta no cuentan como valoraciones. Esta épica consulta datos operativos; no modifica tickets ni políticas de atención.

**Resultado esperado:** Los responsables cuentan con información consistente para evaluar el servicio y decidir mejoras, considerando también la experiencia del solicitante.

### EP-09. Administración y configuración del servicio

**Descripción:** Permitir que el personal autorizado adapte el HelpDesk a la operación de la empresa mediante parámetros y catálogos controlados. La configuración establecerá las opciones y reglas que utilizarán los demás módulos, reduciendo la necesidad de modificar código para ajustes operativos previstos.

**Actores principales:** Administradores y responsables del servicio con permisos de configuración.

**Papel de cada rol:**

- **Administrador:** configura categorías, estados, equipos, enrutamiento, prioridades, SLA, escalamiento, plantillas y la integración con Telegram, con permisos específicos por área; esto no le da acceso a credenciales completas, permisos de usuarios ni contenido de tickets.
- **Supervisor:** participa solo si se le otorgan permisos de configuración, por ejemplo en las reglas de operación del servicio; esto queda por definir.
- **Solicitante y agente:** no configuran; usan lo que esta épica define.

**Alcance funcional:**

- Administrar categorías, subcategorías y opciones de clasificación de solicitudes.
- Mantener los seis estados acordados y sus permisos por rol, con selección explícita y sin restricciones de transición.
- Mantener equipos, niveles de atención y reglas básicas de enrutamiento.
- Configurar prioridades, objetivos de SLA, horarios, días no laborables y reglas de escalamiento.
- Administrar plantillas de notificación y respuestas frecuentes.
- Configurar la integración con Telegram, sus parámetros operativos y la supervisión de fallos y reintentos, restringiendo el acceso a las credenciales.
- Mantener el catálogo de eventos importantes y relevantes, sus destinatarios y plantillas por canal; los eventos de ese catálogo deberán notificarse tanto en la aplicación como por Telegram.
- Validar cambios y desactivar elementos en uso sin eliminar referencias históricas.

**Límites:** No es un diseñador ilimitado de procesos. Cada módulo ejecuta sus reglas: EP-02 gestiona el ciclo de vida, EP-03 la asignación, EP-04 los SLA y EP-06 las comunicaciones. Las cuentas y roles pertenecen a EP-05. El efecto de cambios de configuración sobre tickets existentes deberá definirse explícitamente.

**Resultado esperado:** El servicio puede ajustar su operación de forma controlada, preservando la coherencia de los tickets y su información histórica.

### EP-10. Seguridad, auditoría y recuperación de la información

**Descripción:** Proteger la información del HelpDesk, registrar acciones relevantes y permitir su recuperación ante fallos. Esta épica es transversal: sus controles se incorporarán desde el inicio en todos los módulos y tendrán entregables propios para verificar la confidencialidad, integridad y disponibilidad del sistema.

**Actores principales:** Supervisor y administrador como roles técnicos de auditoría y respaldo; en la práctica, un auditor externo realiza las comprobaciones presencialmente en la empresa, con acceso local y las credenciales de los usuarios, sin cuenta propia ni rol nuevo.

**Papel de cada rol:**

- **Administrador:** opera los controles de seguridad y dispone de las funciones técnicas de auditoría y respaldo, sin acceso indiscriminado a secretos.
- **Supervisor:** dispone de las funciones técnicas de auditoría y respaldo dentro de su alcance.
- **Auditor externo:** por seguridad realiza la auditoría y los respaldos presencialmente, entrando localmente con las credenciales de los usuarios. No tiene una cuenta propia ni es un quinto rol.
- **Solicitante y agente:** se benefician de estos controles; sus roles no incluyen funciones de auditoría o respaldo.

**Alcance funcional y técnico:**

- Aplicar controles de autenticación, sesiones y autorización en las operaciones y el acceso a datos.
- Proteger credenciales, comunicaciones, datos almacenados y archivos adjuntos según su sensibilidad.
- Validar entradas y archivos para prevenir acceso indebido y procesamiento de contenido no permitido.
- Validar el origen de las comunicaciones recibidas mediante la integración con Telegram y la autorización del solicitante o agente sobre el ticket antes de reenviar contenido.
- Proteger las credenciales de integración y auditar vinculaciones, desvinculaciones, cambios de configuración y fallos de envío sin exponer secretos en los registros.
- Limitar la información enviada a Telegram a la necesaria y autorizada para la atención; mantener las notas internas dentro del HelpDesk y aplicar controles a los archivos intercambiados.
- Auditar accesos y acciones relevantes, incluidos cambios de permisos, configuración y operaciones sensibles, registrando actor, fecha y acción.
- Restringir el acceso y la modificación de registros de auditoría para evitar alteraciones no autorizadas.
- Ejecutar respaldos de los datos y archivos necesarios para recuperar el servicio, con acceso y retención controlados.
- Definir procedimientos de restauración y comprobarlos mediante recuperaciones de prueba.
- Incluir en la recuperación el estado de envíos pendientes, para reanudar la integración sin generar duplicados evitables.

**Límites:** El historial del ticket de EP-02 sirve al seguimiento operativo; la auditoría sirve a la revisión de acciones y controles del sistema. Los registros no deben almacenar contraseñas ni secretos. La frecuencia de respaldo, retención, pérdida máxima de datos aceptable y tiempo objetivo de recuperación deberán acordarse con la empresa.

**Resultado esperado:** La información está protegida, las acciones sensibles pueden investigarse y la recuperación del servicio se verifica mediante pruebas, no solo por la existencia de copias de respaldo.

## 4. Criterios comunes y decisiones pendientes

Las decisiones cerradas el 29-oct-2026 están en [Decisiones-de-producto.md](../Decisiones-de-producto.md). Las siguientes definiciones siguen pendientes al convertir las épicas en historias de usuario:

- **Accesos:** Matriz de permisos por rol, equipo y relación con el ticket, incluida la visibilidad de notas internas, adjuntos y reportes.
- **Flujo:** Los seis estados, la selección sin restricciones de transición, el cierre por el agente y la cancelación solo por el supervisor ya están acordados. Falta precisar condiciones de espera, contenido de la solución, posible confirmación previa al cierre y reglas de reapertura.
- **Atención:** Categorías, equipos, niveles, responsables y criterios de asignación y escalamiento.
- **Tiempos:** Matriz de impacto y urgencia, objetivos de SLA, horarios, pausas y efecto de los cambios sobre tickets en curso.
- **Integración con Telegram:** El canal está decidido. Falta concretar y validar el mecanismo de conversación bidireccional, la vinculación verificable de identidades, la identificación del ticket en cada conversación, el tratamiento de archivos y los reintentos ante fallos. Telegram no se incorpora como canal de creación de tickets.
- **Notificaciones por ambos canales:** Precisar el catálogo de eventos importantes y relevantes y sus destinatarios. Todos los eventos incluidos deberán generar notificaciones en la aplicación y en Telegram. Definir el manejo operativo de cuentas sin vinculación, caídas del canal y envíos pendientes.
- **Identidad:** Necesidad de conexión con un directorio de usuarios.
- **Medición:** Fórmulas de indicadores, momento de envío de encuestas y tratamiento de casos reabiertos. La primera respuesta es el primer cambio a «En proceso», calculado desde el historial de estados de EP-02, sin una columna aparte ni reinicios; no cuentan notificaciones automáticas, notas internas ni mensajes de Telegram. Queda pendiente cómo contar esa primera vez cuando el cambio lo hace alguien distinto del agente asignado.
- **Protección y continuidad:** Retención de tickets, archivos y auditoría; objetivos y pruebas de respaldo y recuperación.

La numeración identifica las épicas y no representa un orden de implementación. EP-05 y EP-10 deben acompañar el desarrollo de las capacidades operativas desde el inicio. La accesibilidad, usabilidad, rendimiento y confiabilidad deberán expresarse como requisitos de calidad medibles que apliquen a las épicas pertinentes.
