# User Story Mapping — HelpDesk interno

## 1. Acerca de este documento

Este documento reúne progresivamente las historias de usuario del proyecto y las organiza según el recorrido de sus usuarios. La fuente de alcance es [Epics.md](Epics.md). Actualmente se desarrollan **EP-01: Registro de solicitudes y portal del solicitante**, **EP-02: Gestión del ciclo de vida y seguimiento del ticket**, **EP-03: Asignación y distribución del trabajo**, **EP-04: Gestión de prioridades, SLA y escalamiento**, **EP-05: Gestión de usuarios, roles y accesos**, **EP-06: Comunicación bidireccional por Telegram y notificaciones**, **EP-07: Base de conocimiento y autoservicio**, **EP-08: Reportes, tableros y satisfacción del solicitante**, **EP-09: Administración y configuración del servicio** y **EP-10: Seguridad, auditoría y recuperación de la información**.

**Estado:** propuesta para revisión y refinamiento. Las entregas sugeridas no constituyen compromisos de implementación. Las decisiones pendientes deben resolverse antes de implementar las historias afectadas.

- **Identificador:** `HU-EE-NN`, donde `EE` corresponde al número de la épica y `NN` identifica la historia dentro de ella. Por ejemplo, `HU-02-01` es la primera historia de EP-02. Los identificadores se conservarán al incorporar nuevas épicas.
- **Estilo de las historias:** lenguaje natural, claro y cercano. Cada historia explica quién necesita algo, qué podrá hacer y para qué le servirá, sin exigir una fórmula fija. Este estilo se mantendrá al desarrollar las siguientes épicas.
- **Para revisar con el equipo:** puntos concretos que describen el comportamiento esperado y ayudan a decidir si la historia está completa. Se redactan de forma directa, sin plantillas formales.
- **Dependencias:** capacidades de otras épicas que necesita la historia; se referencian sin desarrollar aquí sus historias.
- **Entregas:** grupos de historias que aportan una experiencia útil al usuario. Su composición es una propuesta, sujeta a las dependencias señaladas.

## 2. EP-01 — Registro de solicitudes y portal del solicitante

### Objetivo y actores

Permitir que un solicitante registre una necesidad de soporte, reciba una referencia única y consulte su atención hasta conocer la solución o solicitar una reapertura.

**Actor principal:** solicitante autenticado y habilitado.

**Actor condicional:** agente autorizado para registrar solicitudes en nombre de otro solicitante, únicamente si la empresa habilita esta opción.

### Límites del recorrido

- El portal registra solicitudes y permite consultar su información autorizada; no incluye un chat propio.
- Las nuevas solicitudes se crean desde el portal, no desde Telegram.
- La conversación bidireccional y el envío de notificaciones pertenecen a EP-06.
- Los estados, las transiciones y la ejecución de reaperturas pertenecen a EP-02.
- El acceso a «Mis solicitudes» se limita a tickets cuyo solicitante es el solicitante. Otros accesos operativos requieren permisos específicos de EP-05.
- Las notas internas y sus archivos restringidos no se muestran al solicitante.

### 2.1. Mapa del recorrido

Las columnas siguen el recorrido habitual del solicitante. Las filas agrupan las historias que se propone desarrollar en cada entrega; las entregas posteriores conservan lo que ya estaba disponible.

| Nivel del mapa | Registrar una necesidad | Encontrar mis solicitudes | Comprender la atención | Continuar la conversación | Revisar el resultado |
| --- | --- | --- | --- | --- | --- |
| Tareas del usuario | Describir el problema, clasificarlo, aportar evidencia y recibir una referencia | Consultar el listado y reducir los resultados | Revisar el detalle y el historial permitido | Acceder a Telegram con el caso identificado | Consultar la solución y pedir reapertura cuando proceda |
| Entrega 1 propuesta: registro y seguimiento básico | HU-01-01 Registrar una solicitud | HU-01-03 Consultar mis solicitudes | HU-01-05 Consultar el detalle | — | HU-01-08 Consultar la solución |
| Entrega 2 propuesta: evidencia y atención integrada | HU-01-02 Adjuntar evidencia | HU-01-04 Filtrar mis solicitudes | HU-01-06 Consultar el historial autorizado | HU-01-07 Acceder a la conversación por Telegram | HU-01-09 Solicitar reapertura |
| Opción condicionada a aprobación de alcance | HU-01-10 Registrar en nombre de otro solicitante | — | — | — | — |

**Valor de la entrega 1:** el solicitante puede registrar su problema y volver al portal para conocer su situación y solución. Requiere capacidades mínimas de EP-02, EP-03, EP-05, EP-09 y EP-10. La consulta de solución necesita que soporte pueda documentarla mediante EP-02.

**Valor de la entrega 2:** el solicitante puede aportar evidencia, localizar casos con mayor facilidad, acceder a Telegram para continuar la atención o pedir reapertura. Requiere además la integración de EP-06 y la vinculación de identidades de EP-05.

**Antes de poner estas funciones en uso:** las entregas propuestas organizan las historias de EP-01, pero también necesitan funciones de otras épicas. Los eventos clasificados como importantes o relevantes requieren notificaciones por aplicación y Telegram mediante EP-06. Una versión que genere esos eventos debe contar con esos avisos, aunque HU-01-07 se desarrolle en la segunda entrega. Los controles de acceso y seguridad acompañan ambas entregas desde el inicio.

### 2.2. Historias de usuario

#### HU-01-01 — Registrar una solicitud de soporte

Cuando un solicitante necesita ayuda, puede registrar su problema en el portal indicando un asunto, una descripción y una categoría. Al terminar, recibe un número de ticket que le permite volver a consultar el caso y seguir su atención.

**Para revisar con el equipo:**

- El solicitante debe haber iniciado sesión y tener su cuenta habilitada. Las categorías disponibles son las que el servicio permite usar.
- Si falta un dato obligatorio, contiene solo espacios o la categoría no es válida, el portal señala qué debe corregirse antes de crear el ticket.
- La solicitud queda a nombre del solicitante, con un identificador único, fecha de creación y el estado inicial acordado. La confirmación permite abrir su detalle.
- Si el registro falla y el ticket no se crea, se informa el problema y se conservan los textos ingresados para volver a intentarlo.

Propuesta para la entrega 1. Se apoya en EP-02 para crear el ticket, EP-05 para identificar al solicitante, EP-09 para las categorías y EP-10 para proteger la información. Los avisos del registro corresponden a EP-06.

#### HU-01-02 — Adjuntar evidencia a una solicitud

El solicitante puede acompañar su solicitud con archivos, por ejemplo una captura del error, para que soporte entienda mejor lo que ocurre. Antes de enviarla, puede revisar qué archivos seleccionó y retirar los que no necesita.

**Para revisar con el equipo:**

- Los archivos deben cumplir las reglas de tipo, tamaño, cantidad y seguridad que acuerde el servicio. Si alguno se rechaza, el portal explica el motivo que pueda comunicarse y conserva el texto de la solicitud.
- Los archivos aceptados quedan asociados al ticket y pueden consultarse desde su detalle según los permisos de cada persona.
- Un enlace directo a un archivo tampoco permite descargarlo sin autorización.
- Se puede registrar una solicitud sin adjuntos, salvo que el equipo acuerde expresamente que sean obligatorios en algún caso.

Propuesta para la entrega 2. Complementa HU-01-01 y utiliza los controles de archivos de EP-10. Falta definir la política de adjuntos y qué ocurre con el envío si falla una carga. Esta historia cubre los archivos del registro; los que se comparten después en la conversación corresponden a EP-06.

#### HU-01-03 — Consultar mis solicitudes

El solicitante encuentra sus casos en «Mis solicitudes» y puede ver en qué estado está cada uno sin tener que preguntar a soporte. Desde el listado puede abrir el caso que le interesa.

**Para revisar con el equipo:**

- El listado muestra únicamente los tickets donde el solicitante figura como solicitante, con su identificador, asunto, fecha de creación y estado actual.
- Al seleccionar un ticket, se abre la información que el solicitante tiene permiso de consultar.
- Si todavía no tiene solicitudes, el portal lo indica y ofrece registrar una nueva.
- Los casos resueltos o cerrados siguen disponibles mientras se encuentren dentro del período de conservación del servicio.

Propuesta para la entrega 1. Utiliza los estados de EP-02 y los permisos y controles de EP-05 y EP-10. La disponibilidad de casos antiguos depende de la política de conservación.

#### HU-01-04 — Filtrar mis solicitudes

Cuando el solicitante tiene varias solicitudes, puede reducir el listado para encontrar las que necesita revisar. Se propone permitir filtros por estado, categoría y fechas de creación.

**Para revisar con el equipo:**

- Los filtros pueden combinarse y solo muestran solicitudes propias que cumplen todos los criterios elegidos.
- El período incluye las fechas de inicio y fin, según la zona horaria acordada para el servicio. Si la fecha inicial es posterior a la final, el portal pide corregirla antes de aplicar el filtro.
- Si no hay coincidencias, el portal lo explica y permite cambiar o quitar los filtros.
- Al limpiar los filtros, vuelven a estar disponibles todas las solicitudes propias que se conservan.

Propuesta para la entrega 2. Complementa HU-01-03 y utiliza los estados de EP-02 y las categorías de EP-09. Los filtros concretos, el orden del listado y la zona horaria todavía deben acordarse.

#### HU-01-05 — Consultar el detalle y la responsabilidad de atención

Al abrir una solicitud, el solicitante puede revisar lo que reportó, conocer su estado y saber quién la está atendiendo. Así encuentra en un mismo lugar la información necesaria para entender la situación de su caso.

**Para revisar con el equipo:**

- El detalle incluye identificador, asunto, descripción, categoría, fecha de creación y un estado fácil de entender.
- Se muestra el equipo o agente responsable según la información que el solicitante tenga permitido conocer. Si aún no hay responsable, se indica claramente.
- Al volver a consultar el caso, se muestran los cambios de estado o responsable que ya se hayan confirmado.
- No se puede acceder al contenido ni a los archivos de un ticket sin permiso, aunque se conozca su identificador o enlace.

Propuesta para la entrega 1. El estado proviene de EP-02, la asignación de EP-03 y las reglas de acceso de EP-05 y EP-10.

#### HU-01-06 — Consultar el historial autorizado del ticket

El solicitante puede revisar lo que ha ocurrido durante la atención de su solicitud. El historial reúne las actividades que puede conocer; los mensajes de Telegram no forman parte de él.

**Para revisar con el equipo:**

- Las actividades aparecen en orden cronológico, con fecha, descripción y autor o responsable cuando corresponda y se permita mostrarlo.
- Las notas internas y sus adjuntos permanecen restringidos, incluso si alguien intenta abrirlos mediante un enlace directo.
- Si todavía no hay novedades visibles después del registro, el portal lo indica.
- El historial es de consulta; la conversación de atención ocurre en Telegram y no se conserva en él.

Propuesta para la entrega 2. Complementa HU-01-05. EP-02 conserva el historial y EP-05 y EP-10 controlan qué puede consultar cada persona.

#### HU-01-07 — Acceder a la conversación de atención por Telegram

Desde el detalle de su ticket, el solicitante puede continuar la atención en Telegram con una referencia clara al caso. Esto le ayuda a conversar con soporte sin confundir solicitudes cuando tiene varias abiertas.

**Para revisar con el equipo:**

- Con una cuenta de Telegram vinculada correctamente, el acceso utiliza el mecanismo que se defina en EP-06 e identifica el ticket seleccionado.
- Tener varios tickets no debe provocar que la conversación se asocie a otro caso por error.
- Si falta vincular la cuenta, el portal explica cómo hacerlo antes de habilitar la conversación.
- Si la integración no está disponible, se informa el problema y el solicitante puede seguir consultando su ticket en el portal.
- No se habilita una conversación ni se muestra información de un caso al que el solicitante no tenga acceso.

Propuesta para la entrega 2. Complementa HU-01-05 y necesita la vinculación de EP-05, la integración de EP-06 y los controles de EP-10. Queda por definir cómo se abre la conversación, qué ocurre si no hay agente asignado y en qué estados está disponible. Solo se contemplan conversaciones gestionadas por la integración.

#### HU-01-08 — Consultar la solución de una solicitud

El solicitante puede leer cómo se resolvió su solicitud para entender la atención recibida y comprobar si el problema quedó solucionado. La solución sigue disponible al consultar el caso después de su cierre.

**Para revisar con el equipo:**

- Cuando existe una solución documentada y disponible para el solicitante, el detalle muestra su contenido y la fecha de resolución.
- Si todavía no se ha registrado una solución, el portal lo indica sin presentar el caso como resuelto.
- La solución de un caso cerrado se puede consultar mientras la información se conserve y el solicitante mantenga el permiso de acceso.
- Leer la solución no cuenta por sí solo como una aceptación del solicitante ni cambia el estado del ticket.

Propuesta para la entrega 1. Complementa HU-01-05. EP-02 gestiona la solución y la resolución del caso; EP-05 y EP-10 controlan el acceso.

#### HU-01-09 — Solicitar la reapertura de un ticket

Si el problema persiste, el solicitante puede pedir que se retome la atención de su ticket y explicar por qué lo necesita. Esta opción estará disponible cuando el caso cumpla las reglas de reapertura que acuerde el servicio.

**Para revisar con el equipo:**

- Los casos que permiten pedir una reapertura ofrecen la opción desde su detalle y solicitan un motivo. No se acepta un motivo vacío o compuesto solo por espacios.
- La petición queda asociada al ticket, con la persona que la hizo, la fecha y la explicación. El portal comunica el resultado del proceso gestionado por EP-02.
- Si la reapertura necesita revisión, se confirma que la petición está pendiente; no se presenta el ticket como reabierto antes de tiempo.
- Si el caso no cumple las reglas, se explica el impedimento y se rechaza la operación, incluso si se intenta mediante un acceso directo.

Propuesta para la entrega 2. Complementa HU-01-08. EP-02 gestiona la reapertura, EP-09 sus reglas, EP-05 y EP-10 los permisos y EP-06 los avisos que correspondan. Falta acordar los estados permitidos, el plazo, si se necesita aprobación y cómo tratar peticiones repetidas; no se da por hecho que la reapertura sea automática.

#### HU-01-10 — Registrar una solicitud en nombre de otro solicitante

Un agente autorizado puede ayudar a un solicitante registrando la solicitud en su nombre. El caso queda a nombre de quien necesita el soporte y conserva también la referencia de quién lo registró.

**Para revisar con el equipo:**

- Esta opción solo funciona si la empresa decide habilitarla y el agente tiene permiso para usarla.
- El agente selecciona a un solicitante habilitado dentro de su alcance autorizado y completa los mismos datos requeridos para una solicitud normal.
- El registro distingue al solicitante del agente que ingresó la solicitud. El solicitante encuentra el ticket en «Mis solicitudes».
- Si la opción está deshabilitada o el agente no tiene permiso, el registro se rechaza también cuando se intenta mediante una solicitud directa.
- Registrar el caso no otorga al agente permisos adicionales para consultarlo o atenderlo.

Esta historia queda fuera de las entregas propuestas hasta confirmar que se habilitará. Se relaciona con HU-01-01 y HU-01-03, con los permisos de EP-05 y con la trazabilidad de EP-10.

### 2.3. Cómo se cubre la épica

| Capacidad de EP-01 | Historias que la cubren | Responsabilidad relacionada |
| --- | --- | --- |
| Registro con asunto, descripción y categoría | HU-01-01 | Catálogos de EP-09 |
| Adjuntos cuando correspondan | HU-01-02 | Protección de EP-10 |
| Validación y entrega de identificador único | HU-01-01 | Registro del ticket de EP-02 |
| Consulta y filtrado de solicitudes propias | HU-01-03, HU-01-04 | Permisos de EP-05 |
| Estado, responsable e información de atención | HU-01-05 | Ciclo de vida de EP-02 y asignación de EP-03 |
| Historial de actividades del ticket | HU-01-06 | Historial de EP-02 |
| Acceso a Telegram con referencia al caso | HU-01-07 | Identidades de EP-05 e integración de EP-06 |
| Consulta de solución y petición de reapertura | HU-01-08, HU-01-09 | Flujo de EP-02 y reglas de EP-09 |
| Registro por agente en nombre de un solicitante, si se habilita | HU-01-10 | Autorización de EP-05 |

### 2.4. Lo que falta acordar con el equipo

| ID | Decisión necesaria | Historias afectadas |
| --- | --- | --- |
| D-01 | Aprobar categorías iniciales, longitudes de asunto y descripción y cualquier obligatoriedad adicional por categoría. | HU-01-01, HU-01-10 |
| D-02 | Definir tipos, tamaños, cantidad y validaciones de archivos, además del comportamiento del envío si falla una carga. | HU-01-02 |
| D-03 | Confirmar filtros, orden inicial del listado y zona horaria del servicio. | HU-01-03, HU-01-04 |
| D-04 | Establecer estados visibles y matriz de información autorizada, incluida la identificación del equipo o agente, actividades y archivos. | HU-01-05, HU-01-06, HU-01-08 |
| D-05 | Definir vinculación, mecanismo de acceso a Telegram y tratamiento de casos sin agente o con conversación no disponible por su estado. | HU-01-07 |
| D-06 | Acordar estados, plazo, aprobación y manejo de peticiones repetidas para reapertura. | HU-01-09 |
| D-07 | Confirmar si se habilita el registro en nombre de otro solicitante y qué agentes pueden usarlo. | HU-01-10 |
| D-08 | Acordar catálogo de eventos relevantes y destinatarios para notificaciones por aplicación y Telegram. | HU-01-01, HU-01-09, HU-01-10; integración con EP-06 |
| D-09 | Definir retención de tickets y archivos, y objetivos medibles de accesibilidad, usabilidad, rendimiento y confiabilidad del portal. | Todas las historias pertinentes |

## 3. EP-02 — Gestión del ciclo de vida y seguimiento del ticket

### Objetivo y participantes

Que soporte pueda llevar cada solicitud desde su registro hasta su resolución y cierre, dejando claro qué está pasando, qué falta por hacer y cómo se atendió el problema.

Participan agentes de soporte y supervisores con acceso al caso. Los solicitantes intervienen en las acciones que el servicio les permita realizar, como aportar información o pedir que se retome la atención.

Se toman como referencia los estados nuevo, asignado, en atención, en espera, resuelto, cerrado y cancelado. Todavía falta acordar cuáles se usarán y qué cambios se permitirán entre ellos; la lista no obliga a que todos los tickets recorran todos los estados.

### Alcance y relación con otras épicas

- EP-01 cubre la experiencia del solicitante al registrar y consultar sus solicitudes. Aquí se desarrolla el trabajo necesario para atenderlas y conservar su historia.
- EP-02 aplica los cambios de estado; EP-09 permite configurar las reglas y EP-05 determina quién puede ejecutar cada acción.
- La asignación de equipos y agentes pertenece a EP-03. Cambiar de estado no concede permisos ni asigna por sí solo un responsable.
- EP-04 calcula los tiempos y aplica las reglas de SLA. Poner un caso en espera no supone automáticamente que su tiempo deje de contar.
- La conversación con el solicitante ocurre en Telegram mediante EP-06. El portal no incorpora un chat y recibir un mensaje no cambia automáticamente el estado del ticket.
- Las notas internas se gestionan en EP-06 y permanecen restringidas. El historial de EP-02 muestra únicamente la información que cada persona puede consultar.
- El historial explica la atención del caso; los registros de auditoría y su protección corresponden a EP-10.

### 3.1. Mapa del recorrido

El recorrido refleja el trabajo habitual de soporte. Las esperas, cancelaciones y reaperturas se utilizan cuando el caso lo necesita, no como pasos obligatorios.

| Nivel del mapa | Organizar la atención | Dejar constancia del trabajo | Completar la información | Resolver y concluir | Retomar un caso |
| --- | --- | --- | --- | --- | --- |
| Tareas del usuario | Actualizar la situación del ticket | Registrar actividades y revisar antecedentes | Pedir información y gestionar esperas | Documentar la solución, cerrar o cancelar con motivo | Revisar una petición de reapertura |
| Entrega 1 propuesta: atención y resolución trazables | HU-02-01 Actualizar el estado | HU-02-02 Registrar actividades; HU-02-09 Consultar el historial | — | HU-02-05 Documentar la solución; HU-02-06 Cerrar el ticket | — |
| Entrega 2 propuesta: continuidad y situaciones especiales | — | — | HU-02-03 Solicitar información; HU-02-04 Gestionar una espera | HU-02-07 Cancelar con justificación | HU-02-08 Gestionar una reapertura |

**Valor de la entrega 1:** soporte puede mantener visible la situación del caso, documentar su trabajo y dejar una solución antes de concluirlo. Se complementa con el registro y la consulta de EP-01.

**Valor de la entrega 2:** soporte puede manejar los casos que necesitan más información, una pausa justificada, cancelación o nueva atención, dejando constancia de lo solicitado.

Estas entregas son una propuesta de organización, no versiones independientes del producto. Ambas necesitan permisos, protección de información y las reglas aplicables. Los eventos importantes o relevantes deben generar los avisos por aplicación y Telegram de EP-06.

### 3.2. Historias de usuario

#### HU-02-01 — Actualizar el estado de un ticket

El agente puede indicar en qué situación se encuentra una solicitud para que quienes participan en ella sepan si ya se está atendiendo, está pendiente de algo o ha llegado a otra etapa del proceso. El sistema le ofrece los cambios que puede realizar según el estado actual y sus permisos.

**Para revisar con el equipo:**

- Cada ticket comienza con el estado inicial acordado y conserva un único estado vigente.
- Solo se aceptan cambios permitidos por las reglas del servicio y por el acceso de la persona al caso, incluso cuando la operación se intenta mediante un acceso directo.
- Antes de aceptar el cambio, se comprueba que se cumplen sus condiciones, como tener una solución documentada para resolver el caso.
- Cada cambio confirmado conserva el estado anterior, el nuevo, la persona o proceso que lo realizó y la fecha, junto con el motivo cuando corresponda.
- Si otra persona ya cambió el estado mientras el agente revisaba el ticket, se informa la situación y se pide revisar los datos vigentes antes de continuar. No se sobrescribe el cambio anterior sin advertencia.
- Si la operación falla, no se presenta el cambio como completado ni se deja un estado sin su registro correspondiente en el historial.

Propuesta para la entrega 1. EP-09 define las reglas configurables, EP-05 y EP-10 controlan los accesos y EP-06 entrega los avisos aplicables. Las historias siguientes detallan las condiciones de algunos cambios. Falta acordar los estados definitivos y quién puede realizar cada transición.

#### HU-02-02 — Registrar el trabajo realizado en una solicitud

El agente puede dejar constancia de las revisiones, pruebas y acciones que realiza durante la atención. Esto permite que él mismo o un compañero autorizado retomen el caso entendiendo qué se ha intentado y qué resultado tuvo.

**Para revisar con el equipo:**

- Cada actividad queda asociada al ticket con una descripción, su autor y la fecha de registro.
- Una descripción vacía o formada solo por espacios no se acepta como actividad.
- Las actividades se incorporan al historial sin sustituir las anteriores. Los cambios relevantes realizados desde otras funciones, como un cambio de estado, se registran desde esas funciones sin obligar al agente a volver a escribirlos.
- Registrar una actividad no cambia por sí solo el estado, la prioridad o el responsable del ticket.
- El contenido solo se muestra a quienes tengan permiso. Registrar una actividad tampoco la envía automáticamente al solicitante como mensaje.

Propuesta para la entrega 1. Se relaciona con HU-02-09 y con los permisos de EP-05 y la protección de EP-10. Las notas internas y la conversación conservan su tratamiento en EP-06. Falta acordar cómo corregir una actividad registrada sin perder su trazabilidad y cuáles de estas actividades podrá ver el solicitante.

#### HU-02-03 — Solicitar información para continuar la atención

Cuando necesita aclaraciones, el agente puede pedir al solicitante la información que falta y dejar constancia de qué necesita para continuar. Así se evita que una solicitud quede detenida sin una razón comprensible.

**Para revisar con el equipo:**

- La petición explica qué información se necesita y queda vinculada al ticket, con autor y fecha. No se acepta una petición sin contenido.
- La comunicación se realiza mediante la integración con Telegram de EP-06 y se dirige al caso correcto.
- Una petición registrada no se presenta como entregada si el envío está pendiente o falló. El estado de entrega proviene de EP-06 y permite distinguir esa situación.
- La respuesta del solicitante llega por Telegram, pero no se conserva en el historial del ticket; el agente registra en una actividad lo que resulte relevante.
- Recibir una respuesta no implica automáticamente que la información sea suficiente ni cambia el estado del ticket. El agente revisa lo recibido y decide la siguiente acción permitida.

Propuesta para la entrega 2. Necesita EP-06 para la comunicación. Si el caso debe quedar en espera, el agente utiliza HU-02-04. Falta acordar cómo se identifica que una petición de información ya fue atendida.

#### HU-02-04 — Dejar un ticket en espera y continuar su atención

Cuando no puede avanzar, el agente puede dejar el caso en espera explicando qué está pendiente. Cuando se resuelve ese impedimento, puede continuar la atención sin perder el contexto de la pausa.

**Para revisar con el equipo:**

- El paso a espera solo está disponible desde los estados permitidos y exige un motivo que explique qué impide continuar.
- El historial conserva el motivo, la fecha y la persona que dejó el caso en espera.
- Al retomar el trabajo, se aplica un cambio permitido y queda constancia de cuándo se retomó, quién lo hizo y qué permitió continuar.
- La información sobre la espera respeta los permisos del solicitante y del equipo de soporte.
- Los tiempos de atención se tratan según EP-04. La espera no pausa el SLA por el solo hecho de cambiar el estado.

Propuesta para la entrega 2. Complementa HU-02-01 y HU-02-03; utiliza las reglas de EP-09 y se relaciona con EP-04. Falta acordar los motivos de espera, los estados desde los que se puede entrar o salir y qué esperas afectan los tiempos del servicio.

#### HU-02-05 — Documentar la solución y resolver el ticket

Cuando termina de atender el problema, el agente explica qué hizo y cuál fue el resultado antes de marcar la solicitud como resuelta. El solicitante recibe una explicación que le permite entender la solución, y soporte conserva una referencia útil del trabajo realizado.

**Para revisar con el equipo:**

- La solución debe contener una explicación; no se permite resolver un ticket con el campo vacío o compuesto solo por espacios.
- Solo una persona autorizada puede resolver el caso y únicamente desde un estado que permita ese cambio.
- La solución, la persona que la registró y la fecha de resolución quedan asociadas al ticket y disponibles en su historial.
- La explicación destinada al solicitante no debe exponer notas internas ni archivos restringidos. El contenido se presenta según los permisos acordados.
- Marcar el ticket como resuelto no equivale a cerrarlo ni a afirmar que el solicitante aceptó la solución.

Propuesta para la entrega 1. Complementa la consulta de solución de HU-01-08 y utiliza HU-02-01 y HU-02-09. EP-06 gestiona los avisos de resolución. Falta acordar si se requiere información adicional para documentar una solución y cómo se corrige posteriormente conservando los antecedentes.

#### HU-02-06 — Cerrar un ticket cuando termina su atención

El personal autorizado puede cerrar una solicitud cuando se cumplen las condiciones acordadas para darla por concluida. El cierre permite distinguir los casos que ya terminaron su proceso de aquellos que tienen una solución pero todavía esperan una acción final.

**Para revisar con el equipo:**

- El cierre solo se realiza desde un estado permitido y después de comprobar las condiciones definidas para el servicio.
- Si falta una condición, se explica qué está pendiente y el ticket conserva su estado actual.
- El historial registra la fecha de cierre y la persona o proceso que lo ejecutó.
- Cerrar el caso no elimina su solución, sus actividades ni la comunicación conservada. La consulta posterior sigue las reglas de acceso y retención.
- Leer una solución o recibir una notificación no se interpreta por sí solo como aceptación del solicitante ni como autorización para cerrar.

Propuesta para la entrega 1. Se apoya en HU-02-01, HU-02-05 y las reglas de EP-09. Falta decidir quién puede cerrar, si se necesita confirmación del solicitante y si habrá cierre automático; no se presupone un plazo ni un mecanismo automático.

#### HU-02-07 — Cancelar una solicitud con una razón clara

Cuando una solicitud ya no debe continuar, una persona autorizada puede cancelarla explicando el motivo. Por ejemplo, podría haberse registrado por error o haber dejado de ser necesaria, si esas razones son aceptadas por el servicio.

**Para revisar con el equipo:**

- La cancelación requiere un motivo y solo se permite en los estados y para los roles que se acuerden.
- El sistema comprueba los permisos y las condiciones antes de cancelar, también si la operación se intenta mediante un acceso directo.
- El historial conserva quién canceló, cuándo lo hizo y por qué. Las actividades y los archivos anteriores no se eliminan por cancelar el ticket.
- Un caso cancelado se identifica como tal; no se presenta como resuelto ni se inventa una solución.
- Si la cancelación no está permitida, el portal explica el impedimento y mantiene el estado actual.

Propuesta para la entrega 2. Utiliza HU-02-01, HU-02-09 y las reglas de EP-05 y EP-09. EP-06 gestiona los avisos aplicables. Falta acordar los motivos admitidos y si el solicitante podrá cancelar directamente, pedir una revisión o no tendrá esa opción.

#### HU-02-08 — Gestionar la reapertura de una solicitud

Cuando el solicitante pide que se revise nuevamente un problema, el proceso de atención permite evaluar su petición y retomar el mismo caso si corresponde. El equipo conserva la solución anterior y los antecedentes para entender por qué fue necesario volver a atenderlo.

**Para revisar con el equipo:**

- La petición iniciada en HU-01-09 conserva el motivo, la persona que la presentó y la fecha. Antes de reabrir, se comprueban las reglas vigentes y los permisos.
- Si se necesita revisión, una persona autorizada puede aceptar o rechazar la petición dejando una explicación. El solicitante puede conocer el resultado permitido desde su ticket.
- Si las reglas permiten una reapertura directa, el sistema aplica esas condiciones sin simular una aprobación manual.
- Una reapertura aceptada lleva el caso al estado que se acuerde y registra quién o qué proceso la ejecutó y cuándo. No se presupone la existencia de un estado llamado «reabierto».
- Si la petición se rechaza o el caso no cumple las condiciones, se conserva la decisión y el ticket no cambia a un estado de atención.
- La reapertura no borra la solución ni las fechas anteriores, y no reinicia por sí sola los SLA ni decide quién atenderá el caso.

Propuesta para la entrega 2. Completa el proceso iniciado en HU-01-09. Utiliza HU-02-01 y HU-02-09; EP-03 determina la responsabilidad, EP-04 el tratamiento de tiempos, EP-09 las reglas y EP-06 los avisos. Se mantienen pendientes los estados elegibles, plazos, aprobación y tratamiento de peticiones repetidas ya señalados en EP-01.

#### HU-02-09 — Consultar la historia de atención de un caso

El agente o supervisor autorizado puede revisar el recorrido de una solicitud para entender qué se hizo, quién participó y por qué cambió su situación. Esto facilita continuar la atención y explicar cómo se llegó al resultado del caso.

**Para revisar con el equipo:**

- El historial reúne el registro inicial, las actividades y los cambios relevantes, con sus fechas y responsables, en un orden que permita reconstruir la atención.
- Las soluciones, esperas, cancelaciones y reaperturas conservan sus motivos y antecedentes cuando correspondan. Una nueva etapa no borra las anteriores.
- Los cambios originados en otras funciones, como la asignación de EP-03, se incorporan con su referencia al caso; el historial no ejecuta esas acciones.
- Cada persona ve solo el contenido que tiene permitido consultar. Ser agente, supervisor o administrador no concede por sí solo acceso a todos los casos.
- Las notas internas y los archivos restringidos mantienen sus controles de acceso, incluso mediante enlaces directos. La vista del solicitante sigue lo definido en HU-01-06.

Propuesta para la entrega 1. Reúne la información producida por las funciones del ticket y aplica EP-05 y EP-10. Este historial sirve para seguir la atención; la auditoría de seguridad conserva su alcance propio en EP-10.

### 3.3. Cómo se cubre la épica

| Capacidad de EP-02 | Historias que la cubren | Relación con otras épicas |
| --- | --- | --- |
| Estados y cambios autorizados | HU-02-01; condiciones específicas en HU-02-04 a HU-02-08 | Configuración de EP-09 y permisos de EP-05 |
| Registro de actividades, cambios, responsables y fechas | HU-02-01, HU-02-02, HU-02-09 | Asignaciones de EP-03 y protección de EP-10 |
| Solución documentada antes de resolver y condiciones de cierre | HU-02-05, HU-02-06 | Consulta del solicitante en HU-01-08 |
| Solicitudes de información y esperas justificadas | HU-02-03, HU-02-04 | Comunicación de EP-06 y tiempos de EP-04 |
| Cancelaciones y reaperturas con motivo | HU-02-07, HU-02-08 | Petición del solicitante en HU-01-09 y reglas de EP-09 |
| Historial conservado y visible según permisos | HU-02-09 | Consulta del solicitante en HU-01-06; EP-05 y EP-10 |

### 3.4. Lo que falta acordar con el equipo

Se continúa la numeración de decisiones de EP-01. Cuando una definición ya existe como pendiente, se referencia para resolverla una sola vez.

| ID | Decisión necesaria | Historias afectadas |
| --- | --- | --- |
| D-10 | Definir estados inicial y finales, cambios permitidos, condiciones y roles que pueden ejecutarlos. Complementa D-04 sobre lo que ve el solicitante. | HU-02-01, HU-02-04 a HU-02-08 |
| D-11 | Acordar qué actividades se registran, quién puede verlas y cómo corregirlas sin perder antecedentes. | HU-02-02, HU-02-09 |
| D-12 | Definir cuándo se considera atendida una petición de información y qué motivos permiten dejar un caso en espera o retomarlo. Coordinar su efecto sobre SLA con EP-04. | HU-02-03, HU-02-04 |
| D-13 | Acordar el contenido necesario de la solución, su corrección posterior y las condiciones de cierre, incluida una posible confirmación o automatización. | HU-02-05, HU-02-06 |
| D-14 | Definir motivos y estados que permiten cancelar, y si el solicitante puede hacerlo directamente o necesita revisión. | HU-02-07 |
| D-06, ampliación | Resolver las reglas de reapertura ya pendientes en EP-01 y acordar el estado de destino, la asignación y el efecto en los tiempos. | HU-02-08; HU-01-09 |
| D-08, seguimiento | Confirmar cuáles de estos cambios son eventos relevantes, sus destinatarios y los avisos por aplicación y Telegram. | Historias que originen eventos de atención |
| D-09, seguimiento | Aplicar la retención y los objetivos de calidad acordados al historial, las soluciones y los archivos. | HU-02-02, HU-02-05, HU-02-09 |

## 4. EP-03 — Asignación y distribución del trabajo

### Objetivo y participantes

Que cada solicitud llegue al equipo adecuado y tenga una responsabilidad de atención clara. Los agentes y supervisores pueden organizar el trabajo, identificar casos que nadie ha tomado y redistribuirlos cuando sea necesario, sin perder lo que ya se ha hecho.

Los agentes participan dentro de los equipos, niveles y casos que tienen autorizados. Los supervisores distribuyen y revisan el trabajo dentro de su propio alcance; su rol no les da acceso automático a todas las solicitudes de la empresa.

### Alcance y relación con otras épicas

- EP-03 determina a qué equipo o agente se dirige el trabajo. EP-05 administra las cuentas, los permisos y la pertenencia a equipos, y EP-09 configura la estructura y las reglas de distribución.
- Tener un equipo responsable y tener un agente asignado son situaciones distintas. Un caso puede estar en una cola esperando que un agente lo tome, si las reglas lo permiten.
- Los cambios de estado se validan en EP-02. Asignar, tomar o transferir un ticket no permite saltarse sus condiciones ni reinicia su atención o historial.
- EP-04 determina cuándo corresponde un escalamiento por riesgo o incumplimiento de SLA. EP-03 ejecuta la transferencia que proceda, sin decidir los umbrales ni recalcular los tiempos.
- EP-06 utiliza la responsabilidad vigente para dirigir la comunicación y los avisos. EP-03 comunica los cambios necesarios, respetando los permisos y la vinculación de identidades de EP-05.
- La distribución se apoya en reglas básicas y decisiones del personal autorizado. No se presupone inteligencia artificial, reparto automático por carga ni una optimización avanzada.

### 4.1. Mapa del recorrido

El recorrido empieza por reconocer el trabajo pendiente y continúa con su asignación y seguimiento. La redistribución se utiliza cuando cambia la necesidad del caso o la capacidad del equipo.

| Nivel del mapa | Reconocer el trabajo pendiente | Dar una responsabilidad al caso | Revisar la distribución | Redistribuir y dar continuidad |
| --- | --- | --- | --- | --- |
| Tareas del usuario | Revisar colas y detectar solicitudes sin responsable | Elegir equipo y agente, tomar un caso o aplicar una regla configurada | Consultar la carga y los antecedentes de asignación | Cambiar agente o equipo y mantener la comunicación con las personas autorizadas |
| Entrega 1 propuesta: distribución y seguimiento básicos | HU-03-01 Consultar colas; HU-03-02 Identificar casos sin asignación | HU-03-03 Asignar un ticket | HU-03-09 Consultar el historial de responsables | HU-03-06 Reasignar a otro agente; HU-03-10 Mantener los destinatarios vigentes |
| Entrega 2 propuesta: toma de casos y apoyo a la distribución | — | HU-03-04 Tomar un ticket; HU-03-08 Aplicar reglas básicas de enrutamiento | HU-03-05 Consultar la carga de trabajo | HU-03-07 Transferir a otro equipo o nivel |

**Valor de la entrega 1:** el equipo puede localizar solicitudes pendientes de asignación, darles un responsable y sustituirlo cuando haga falta, conservando la trazabilidad y la continuidad de la comunicación.

**Valor de la entrega 2:** los agentes pueden tomar trabajo autorizado y los supervisores cuentan con información para distribuirlo. También se incorporan el enrutamiento básico y las transferencias entre equipos o niveles.

Estas entregas son una propuesta. Necesitan las capacidades de acceso, historial, configuración y comunicación de las otras épicas. HU-03-10 debe acompañar cualquier entrega que cambie responsables y utilice Telegram. Si un escalamiento de EP-04 necesita transferir entre equipos o niveles, HU-03-07 también debe estar disponible.

### 4.2. Historias de usuario

#### HU-03-01 — Consultar las colas de trabajo

El agente o supervisor puede revisar las solicitudes organizadas por equipo, categoría o nivel de atención, según la estructura del servicio. Así encuentra el trabajo que le corresponde sin tener que recorrer todos los tickets del sistema.

**Para revisar con el equipo:**

- Cada persona puede consultar únicamente las colas y los casos que tiene autorizados.
- Se propone mostrar identificador, asunto, categoría, estado, equipo y agente responsable, distinguiendo cuándo todavía no hay agente asignado.
- Desde la cola se puede abrir el detalle autorizado del ticket. Ver un caso en una cola no concede por sí solo permiso para tomarlo o reasignarlo.
- Al volver a consultar una cola, se reflejan las asignaciones y transferencias confirmadas. Un mismo ticket visible en distintas agrupaciones sigue siendo un solo caso.
- Si una cola no contiene solicitudes, se indica claramente.

Propuesta para la entrega 1. Utiliza la estructura de EP-09, los accesos de EP-05 y EP-10 y los estados de EP-02. Falta acordar las agrupaciones, los datos visibles, el orden y qué estados forman parte del trabajo pendiente.

#### HU-03-02 — Identificar solicitudes que todavía necesitan asignación

El supervisor puede localizar los casos que aún no tienen equipo o que ya llegaron a un equipo pero siguen sin agente. Esto le permite intervenir antes de que una solicitud quede olvidada entre las demás.

**Para revisar con el equipo:**

- Se distingue entre una solicitud sin equipo responsable y otra con equipo pero sin agente, cuando esas situaciones estén permitidas.
- La consulta muestra solo los casos del alcance autorizado del supervisor y permite abrirlos para asignarlos.
- Se propone mostrar la fecha de registro para ayudar a reconocer cuánto tiempo lleva el caso pendiente, sin interpretarla como un cálculo de incumplimiento de SLA.
- Un ticket con agente asignado deja de aparecer como pendiente de agente cuando se actualiza la consulta.
- Un caso que no pudo dirigirse mediante una regla automática permanece localizable por el personal autorizado; no desaparece por falta de coincidencia.

Propuesta para la entrega 1. Se relaciona con HU-03-01, HU-03-03 y HU-03-08. Falta acordar quién revisa los casos sin equipo y cuáles requieren asignación según su estado. Los riesgos y vencimientos corresponden a EP-04.

#### HU-03-03 — Asignar un ticket al equipo y agente adecuados

El supervisor o la persona autorizada puede dirigir una solicitud al equipo que debe atenderla y, cuando corresponda, elegir un agente. El caso queda con una responsabilidad visible para que el trabajo pueda comenzar.

**Para revisar con el equipo:**

- Solo se pueden elegir equipos y agentes habilitados y autorizados para atender el caso. Se comprueba que la combinación de equipo, nivel y agente sea válida según las reglas del servicio.
- Si se permite asignar primero al equipo, el ticket queda identificado como pendiente de agente. No se presenta como una asignación personal completada.
- Antes de guardar, se vuelven a comprobar los permisos, la situación del ticket y la disponibilidad de la asignación elegida. No basta con que la opción haya aparecido al abrir el formulario.
- La asignación confirmada queda visible en el caso y registra quién o qué proceso la realizó y cuándo. Cualquier cambio de estado asociado se valida mediante EP-02.
- Si otra persona ya modificó la asignación, se informa y se pide revisar la situación vigente antes de reemplazarla. Si la operación falla, no se confirma una asignación que no quedó guardada.

Propuesta para la entrega 1. Utiliza EP-05 y EP-09 para las opciones permitidas, EP-02 para estados e historial y EP-10 para protección. HU-03-10 mantiene la comunicación al día. Falta acordar si todos los casos necesitan equipo y agente desde el inicio y qué relación existe entre asignación y estado.

#### HU-03-04 — Tomar un ticket de una cola autorizada

El agente puede tomar una solicitud disponible de su cola cuando las reglas le permiten elegir su siguiente caso. Así puede empezar a atender trabajo pendiente sin esperar una asignación individual del supervisor.

**Para revisar con el equipo:**

- La opción solo está disponible para agentes habilitados que pueden atender el ticket y para casos que cumplen las condiciones acordadas.
- Al tomarlo, el agente queda como responsable y el cambio se refleja en el detalle, la cola y el historial.
- Si dos agentes intentan tomar el mismo caso, solo una operación puede completarse. El otro agente recibe la información de que el ticket ya no está disponible para tomarlo.
- Tomar un caso no permite desplazar al responsable de un ticket ya asignado; ese cambio utiliza las reglas de reasignación.
- La acción no cambia por sí sola la prioridad ni evita la validación del estado en EP-02.

Propuesta para la entrega 2. Complementa HU-03-01 y utiliza los controles de HU-03-03 y la continuidad de HU-03-10. Falta acordar qué colas permiten esta modalidad y si habrá límites de casos que un agente puede tomar.

#### HU-03-05 — Consultar la carga de trabajo antes de distribuir casos

El supervisor puede ver cómo se reparte el trabajo entre sus equipos y agentes para decidir dónde asignar una nueva solicitud o cuándo conviene redistribuir casos. La información sirve como apoyo a su criterio y permite revisar los tickets que explican cada cantidad.

**Para revisar con el equipo:**

- Se propone mostrar la cantidad de tickets pendientes por equipo y agente, con una separación por estado y una identificación de los casos sin agente.
- Las cantidades se calculan con los estados y el alcance que acuerde el servicio. La vista deja claro qué incluye, especialmente respecto a tickets en espera o resueltos que todavía no están cerrados.
- Un ticket se cuenta una sola vez dentro de cada total correspondiente, aunque aparezca en más de una agrupación de consulta.
- Desde una cantidad se pueden revisar los casos que la componen, siempre dentro de los permisos vigentes.
- La cantidad de tickets no se presenta como una medida automática de esfuerzo, productividad o disponibilidad. Consultar la carga no reasigna casos por sí solo.

Propuesta para la entrega 2. Se relaciona con HU-03-01, HU-03-03 y HU-03-06. EP-02 aporta los estados y EP-05 limita el alcance. Esta vista apoya la distribución actual; los reportes históricos y la evaluación del servicio pertenecen a EP-08. Falta acordar qué cuenta como carga y qué detalle podrá ver cada rol.

#### HU-03-06 — Reasignar un ticket a otro agente

Si cambia la disponibilidad del agente o conviene que otra persona continúe, el supervisor o personal autorizado puede reasignar el caso dentro del equipo. La nueva persona recibe el contexto necesario y queda claro por qué cambió la responsabilidad.

**Para revisar con el equipo:**

- Se elige un agente habilitado y autorizado para atender el caso dentro del equipo correspondiente.
- La reasignación requiere un motivo con contenido y conserva el responsable anterior, el nuevo, la persona que hizo el cambio y la fecha.
- El historial, la solución previa y las notas internas del caso se conservan. El nuevo agente accede únicamente a la información permitida para su función.
- Antes de guardar se comprueba que la asignación no haya cambiado desde que se inició la operación. Un conflicto se informa antes de reemplazar al responsable vigente.
- Si la reasignación no se completa, se conserva la responsabilidad anterior. Reasignar tampoco reinicia los tiempos del caso ni supone volver a crearlo.

Propuesta para la entrega 1. Complementa HU-03-03, HU-03-09 y HU-03-10. EP-02 conserva la historia, EP-04 trata los tiempos y EP-05 los permisos. Los cambios de equipo o nivel se cubren en HU-03-07. Falta acordar si un agente puede devolver un caso a la cola y cómo se gestionan las solicitudes de agentes desactivados.

#### HU-03-07 — Transferir un ticket a otro equipo o nivel

Cuando el problema necesita la intervención de otro equipo o nivel de soporte, el personal autorizado puede transferirlo explicando la razón. El caso continúa con sus antecedentes y con una responsabilidad identificable durante el cambio.

**Para revisar con el equipo:**

- Solo se puede transferir a equipos o niveles habilitados para recibir el caso, y se exige un motivo.
- Se define el equipo de destino y, cuando corresponda, un agente válido para ese destino. Si queda pendiente de agente, se muestra claramente en la cola correspondiente.
- No se conserva por descuido un agente que no puede atender en el destino. La responsabilidad resultante debe cumplir las reglas del servicio.
- Si se exige aceptación del equipo receptor, el caso mantiene identificable a su responsable durante la espera. No se muestra la transferencia como completada antes de esa aceptación.
- Se conservan el origen, el destino, el motivo, la persona o proceso que hizo la transferencia y sus fechas, sin borrar las actividades anteriores.
- Una transferencia fallida no elimina la asignación vigente. Si nace de un escalamiento, se conserva la referencia al evento de EP-04 que la motivó.

Propuesta para la entrega 2. Utiliza HU-03-09 y HU-03-10 y se coordina con EP-02, EP-04, EP-05 y EP-09. Falta acordar los destinos permitidos, si la transferencia es inmediata o requiere aceptación y quién conserva la responsabilidad mientras se decide.

#### HU-03-08 — Dirigir solicitudes mediante reglas básicas

El equipo puede recibir las solicitudes en la cola adecuada sin que un supervisor tenga que elegir el destino de cada una, cuando existe una regla configurada para ello. Por ejemplo, una categoría puede dirigir los casos a un equipo definido por el servicio.

**Para revisar con el equipo:**

- Solo se aplican reglas habilitadas y configuradas en EP-09, según los datos del ticket y el momento de aplicación que se acuerde.
- El destino debe estar habilitado y ser válido para el caso. Una regla no permite ignorar los controles de acceso o asignar a una persona no autorizada.
- La asignación conserva la regla que se utilizó, el resultado y la fecha para que el equipo pueda entender por qué llegó a ese destino.
- Si no hay coincidencia, el destino no está disponible o existen reglas incompatibles sin una precedencia definida, el caso queda visible para revisión autorizada. No se elige un destino arbitrario ni se informa un enrutamiento exitoso.
- Volver a procesar el mismo evento no genera reasignaciones ni entradas repetidas. Tampoco reemplaza una asignación manual posterior sin una regla expresa que lo permita.

Propuesta para la entrega 2. Se apoya en HU-03-02, HU-03-03, HU-03-09 y HU-03-10. EP-09 administra las reglas; esta historia las aplica. Falta acordar cuándo se ejecutan, su precedencia y el tratamiento de cambios de categoría o de configuración sobre tickets existentes. No incluye reparto inteligente ni asignación automática por menor carga.

#### HU-03-09 — Consultar quién ha sido responsable del caso

El agente o supervisor autorizado puede revisar por qué equipos y agentes ha pasado un ticket y por qué se hicieron los cambios. Esto ayuda a retomar el trabajo y entender las decisiones de distribución sin reconstruirlas a partir de mensajes sueltos.

**Para revisar con el equipo:**

- La asignación inicial y cada toma, reasignación o transferencia confirmada aparecen en orden cronológico dentro del historial del caso.
- Cada registro identifica la responsabilidad anterior y la nueva cuando corresponda, la fecha y la persona o proceso que realizó la acción. Los cambios que requieren motivo lo conservan.
- Las asignaciones por reglas permiten reconocer la regla aplicada; las transferencias por escalamiento conservan la referencia correspondiente.
- Desactivar a un agente o equipo no elimina su referencia histórica. La responsabilidad actual se distingue de las anteriores.
- Cada persona consulta únicamente la información autorizada. Haber atendido el ticket en el pasado no garantiza acceso permanente a su contenido.

Propuesta para la entrega 1. Amplía el historial de HU-02-09 con los datos de distribución; no crea un historial independiente. Se relaciona con la consulta del responsable en HU-01-05 y aplica los permisos y la protección de EP-05 y EP-10.

#### HU-03-10 — Mantener la comunicación dirigida a las personas correctas

Después de una asignación o transferencia, el solicitante puede continuar la atención con las personas que ahora tienen responsabilidad sobre el caso. El equipo evita que los nuevos mensajes se dirijan a alguien que ya no tiene permiso para recibirlos.

**Para revisar con el equipo:**

- Una asignación confirmada pone a disposición de EP-06 la responsabilidad vigente para actualizar los destinatarios autorizados del caso.
- Antes de enviar o reenviar contenido se comprueban los permisos y la vinculación vigente. Una identidad desvinculada o un agente que perdió acceso no recibe nuevos contenidos del ticket por haber sido responsable anteriormente.
- Cambiar al responsable no da al nuevo agente acceso a conversaciones anteriores de Telegram; el contexto del caso lo obtiene del historial del ticket conforme a sus permisos.
- Si el nuevo responsable no tiene una vinculación válida de Telegram o falla la actualización del canal, la asignación sigue siendo visible en el HelpDesk y se registra la incidencia para su recuperación. No se presenta el envío como completado ni se utiliza como sustituto a un destinatario sin permiso.
- Los mensajes pendientes se revisan según la responsabilidad y los permisos vigentes antes de enviarse. Los reintentos no deben producir avisos duplicados del mismo evento en un mismo canal.
- Los avisos de asignación o transferencia clasificados como relevantes se envían por aplicación y Telegram mediante EP-06, con seguimiento independiente de sus resultados.

Propuesta para la entrega 1 y para cualquier entrega que cambie responsables con Telegram integrado. EP-03 aporta el cambio de responsabilidad, EP-05 la identidad y los permisos, y EP-06 dirige los mensajes y gestiona los envíos y fallos. EP-10 protege la información. Falta acordar los destinatarios de cada evento y el tratamiento de conversaciones sin agente asignado o con transferencias pendientes.

### 4.3. Cómo se cubre la épica

| Capacidad de EP-03 | Historias que la cubren | Relación con otras épicas |
| --- | --- | --- |
| Colas por equipo, categoría o nivel | HU-03-01 | Estructura de EP-09 y permisos de EP-05 |
| Asignación a equipos y agentes habilitados | HU-03-03 | Estados de EP-02; habilitación de EP-05 |
| Toma autorizada de tickets desde una cola | HU-03-04 | Reglas de EP-09 y permisos de EP-05 |
| Reasignaciones y transferencias con motivo | HU-03-06, HU-03-07 | Flujo de EP-02 y escalamientos de EP-04 |
| Historial de responsables | HU-03-09 | Historial de HU-02-09 y consulta de HU-01-05 |
| Identificación de casos sin asignación y consulta de carga | HU-03-02, HU-03-05 | Estados de EP-02; alcance distinto de los reportes de EP-08 |
| Enrutamiento básico por reglas configuradas | HU-03-08 | Configuración de EP-09 |
| Actualización de destinatarios de Telegram sin perder contexto | HU-03-10 | Identidades de EP-05, comunicación de EP-06 y protección de EP-10 |

### 4.4. Lo que falta acordar con el equipo

Se continúa la numeración de decisiones y se reutilizan las definiciones pendientes que afectan a varias épicas.

| ID | Decisión necesaria | Historias afectadas |
| --- | --- | --- |
| D-16 | Definir equipos, niveles, agrupaciones de colas, datos visibles y orden de consulta. Acordar quién revisa casos sin equipo. | HU-03-01, HU-03-02 |
| D-17 | Acordar las combinaciones permitidas de equipo, nivel y agente, y si puede haber asignación solo a equipo. Precisar quién puede asignar, tomar y redistribuir. | HU-03-03, HU-03-04, HU-03-06, HU-03-07 |
| D-18 | Definir las colas que permiten tomar casos y posibles límites de trabajo por agente. | HU-03-04 |
| D-19 | Acordar qué estados y casos se incluyen en la carga de trabajo y qué desglose puede consultar cada rol. | HU-03-02, HU-03-05 |
| D-20 | Definir cómo se devuelven casos a la cola y qué sucede con las asignaciones cuando un agente o equipo se desactiva. | HU-03-03, HU-03-06, HU-03-09 |
| D-21 | Acordar destinos y condiciones de transferencia, necesidad de aceptación y responsabilidad mientras queda pendiente. | HU-03-07, HU-03-10 |
| D-22 | Definir momentos de aplicación, precedencia y tratamiento de fallos de las reglas de enrutamiento, así como su efecto sobre casos ya asignados. | HU-03-08 |
| D-10, seguimiento | Acordar qué cambios de estado acompañan una asignación, toma o transferencia y validarlos mediante EP-02. | HU-03-03, HU-03-04, HU-03-06, HU-03-07 |
| D-04 y D-08, seguimiento | Precisar qué datos de los responsables ve el solicitante y quién recibe cada aviso. Acordar el tratamiento de mensajes pendientes, casos sin agente y transferencias en espera en EP-06. | HU-03-09, HU-03-10; HU-01-05 |

## 5. EP-04 — Gestión de prioridades, SLA y escalamiento

### Objetivo y participantes

Que soporte pueda reconocer qué solicitudes necesitan atención prioritaria, conocer sus compromisos de tiempo y actuar cuando un caso se acerca a un atraso o ya lo presenta. Los acuerdos de nivel de servicio, o SLA, establecen cuánto tiempo tiene el equipo para dar una primera respuesta y resolver una solicitud, según las reglas de la empresa.

Participan agentes de soporte, supervisores y responsables autorizados de las políticas del servicio. Cada persona consulta o modifica información dentro de su alcance de acceso.

### Alcance y relación con otras épicas

- La prioridad se determina con criterios de impacto y urgencia acordados. No se da por hecho que el solicitante pueda elegirla ni que existan valores o tiempos ya aprobados.
- EP-09 administra las prioridades, políticas de SLA, calendarios y reglas de escalamiento. EP-04 aplica esas definiciones y conserva los datos que explican sus cálculos.
- La primera respuesta y la resolución son compromisos distintos. Una notificación automática no cuenta como respuesta del agente, y cerrar un ticket no equivale a registrar su primera resolución.
- EP-02 aporta los cambios de estado, las esperas, las soluciones y las reaperturas. Estar en espera no pausa los tiempos por sí solo y reabrir no los reinicia automáticamente.
- EP-04 identifica cuándo corresponde escalar. EP-03 realiza las reasignaciones o transferencias necesarias y EP-06 entrega los avisos por aplicación y Telegram.
- EP-06 aporta la evidencia de la comunicación del agente por Telegram. Se debe acordar qué evento y fecha acreditan una respuesta, sin confundir envío, entrega y lectura.
- EP-08 utiliza los datos para reportes e indicadores. Aquí se controla la situación de cada caso y se conserva la evidencia de cumplimiento o atraso.
- EP-05 y EP-10 controlan los permisos y protegen la información desde la primera entrega.

### 5.1. Mapa del recorrido

El equipo primero establece la importancia y los compromisos del caso, después sigue su atención y actúa ante los riesgos. Puede revisar las decisiones y los cálculos durante todo el recorrido.

| Nivel del mapa | Establecer la atención necesaria | Conocer los compromisos | Seguir el tiempo de atención | Actuar ante atrasos | Revisar lo ocurrido |
| --- | --- | --- | --- | --- | --- |
| Tareas del usuario | Evaluar impacto y urgencia; justificar ajustes | Identificar el SLA y sus fechas límite | Reconocer la respuesta, la resolución y las pausas permitidas | Detectar riesgos, recibir avisos y escalar | Consultar cambios y evidencia de cumplimiento |
| Entrega 1 propuesta: prioridades y seguimiento de tiempos | HU-04-01 Determinar la prioridad | HU-04-03 Consultar los vencimientos | HU-04-04 Reconocer la primera respuesta; HU-04-05 Registrar el resultado del tiempo de resolución | HU-04-07 Identificar riesgo e incumplimiento; HU-04-09 Recibir avisos relevantes | HU-04-10 Consultar el historial de prioridad y SLA |
| Entrega 2 propuesta: ajustes y escalamiento | HU-04-02 Ajustar la prioridad | — | HU-04-06 Aplicar pausas y reanudaciones | HU-04-08 Escalar un caso | — |

**Valor de la entrega 1:** el equipo puede conocer la prioridad y los compromisos del ticket, registrar su atención y distinguir los casos que requieren intervención por sus tiempos.

**Valor de la entrega 2:** se incorporan los ajustes de prioridad, las pausas permitidas y la activación de escalamientos, conservando los antecedentes.

Estas entregas son una propuesta de organización, no una autorización para aplicar políticas incompletas. Si el SLA inicial incluye pausas, ajustes de prioridad o escalamiento, las historias correspondientes deben acompañar la primera entrega. El cálculo de horarios y días no laborables forma parte de HU-04-03 desde el inicio. Los avisos relevantes necesitan ambos canales de EP-06 y la primera respuesta necesita evidencia de la integración con Telegram.

### 5.2. Historias de usuario

#### HU-04-01 — Determinar la prioridad de una solicitud

El agente o la persona autorizada puede indicar el impacto del problema y la urgencia de atenderlo. Con esos datos, el sistema determina la prioridad según los criterios del servicio, para que el equipo tenga una base común al decidir qué atender primero.

**Para revisar con el equipo:**

- Las opciones de impacto y urgencia incluyen una explicación que ayude a elegirlas de manera consistente. Sus valores y combinaciones provienen de la configuración aprobada.
- La prioridad resultante corresponde a la combinación seleccionada y queda visible para quienes tengan permiso de consultarla.
- Se conservan los datos utilizados, la regla aplicada, la fecha y la persona o proceso que realizó la evaluación.
- Si falta información o no existe una regla válida para la combinación, se indica que la prioridad está pendiente de determinar. No se asigna una prioridad por suposición ni se presenta el caso como correctamente evaluado.
- Evaluar la prioridad no cambia por sí solo el responsable ni el estado del ticket.

Propuesta para la entrega 1. EP-09 define los criterios y EP-05 controla quién puede evaluarlos. Falta acordar la matriz de impacto y urgencia, los nombres de las prioridades y quién realiza la evaluación inicial. La prioridad alimenta el SLA cuando así lo establezca la política del servicio.

#### HU-04-02 — Ajustar la prioridad con una explicación

Si cambia la situación del problema o la evaluación inicial no refleja su importancia, una persona autorizada puede ajustar la prioridad explicando la razón. El equipo puede reconocer el cambio y entender cómo afecta los compromisos del caso.

**Para revisar con el equipo:**

- El ajuste requiere un motivo con contenido y permiso para realizarlo. Se distingue entre corregir impacto o urgencia y aplicar una excepción autorizada a la prioridad calculada.
- Se conservan la prioridad anterior, la nueva, el motivo, la fecha y quién hizo el cambio, junto con los datos de evaluación que correspondan.
- El efecto sobre el SLA se aplica según la política acordada. Se conserva el vencimiento anterior y se muestra el nuevo cuando haya un recálculo.
- Un cambio de prioridad no borra un incumplimiento previo ni reinicia el tiempo transcurrido por suposición.
- Si alguien ya modificó la prioridad mientras se revisaba el caso, se informa la situación y se pide revisar el dato vigente antes de reemplazarlo.

Propuesta para la entrega 2. Complementa HU-04-01, HU-04-03 y HU-04-10. EP-09 define el efecto del cambio y EP-06 entrega los avisos aplicables. Falta acordar quién puede hacer excepciones y cómo se calculan los tiempos al aumentar o disminuir la prioridad.

#### HU-04-03 — Conocer las fechas límite de atención

El agente o supervisor puede consultar qué compromiso de primera respuesta y de resolución corresponde a un ticket y cuándo vence cada uno. Así puede organizar el trabajo con fechas comprensibles y conocer las reglas que explican esos tiempos.

**Para revisar con el equipo:**

- Se identifica la política de SLA aplicable al caso y se calculan por separado los vencimientos de primera respuesta y resolución.
- El cálculo utiliza el evento de inicio, los objetivos, la zona horaria, los horarios laborales y los días no laborables acordados. Fuera del horario aplicable solo se cuenta tiempo si la política así lo establece.
- Cuando corresponda, se incorporan las pausas válidas de HU-04-06. Los ajustes y reaperturas se tratan según reglas expresas, no como un reinicio automático.
- Se conservan la política y el calendario utilizados para poder explicar el resultado, aunque la configuración cambie después.
- Si falta una política válida o hay reglas incompatibles sin una precedencia definida, se indica que el cálculo no está disponible y requiere revisión. No se muestra un vencimiento inventado ni un cumplimiento confirmado.
- Un cambio de equipo o agente no altera por sí solo el inicio del conteo ni elimina tiempo ya consumido.

Propuesta para la entrega 1. EP-09 aporta políticas y calendarios; EP-02 los eventos del caso. Falta definir los valores de SLA, su selección, el inicio de cada conteo y el efecto de cambios de configuración sobre tickets existentes.

#### HU-04-04 — Reconocer la primera respuesta de atención

El equipo puede comprobar cuándo un agente dio la primera respuesta de atención al solicitante por Telegram. Esa evidencia permite evaluar el compromiso de respuesta sin confundir un aviso automático con una intervención real de soporte.

**Para revisar con el equipo:**

- La respuesta debe provenir de un agente autorizado, estar asociada al ticket correcto y cumplir el criterio de atención que acuerde el servicio.
- Se conserva únicamente el autor y la fecha del evento que acredita la respuesta según la política aprobada, sin guardar el contenido del mensaje. No se sustituye esa fecha por la del procesamiento posterior si son distintas.
- Los avisos automáticos, las notas internas, los mensajes del solicitante y los reintentos de un mismo mensaje no cuentan como una nueva primera respuesta.
- Un envío pendiente o fallido no se presenta como respuesta acreditada si no cumple el evento requerido. Tampoco se afirma que el solicitante leyó el mensaje sin evidencia.
- La respuesta se compara con el vencimiento correspondiente. Si llegó tarde, se registra como realizada fuera de tiempo; atender después no elimina el atraso.
- Si la integración informa tarde un evento de respuesta anterior, se revisa el cálculo con su fecha válida y se conserva la explicación de cualquier corrección. No se toma simplemente el primer evento procesado como el primero ocurrido.

Propuesta para la entrega 1. Utiliza la comunicación de EP-06 y las identidades de EP-05. Falta acordar qué contenido cuenta como atención, qué evento acredita la respuesta y cómo afectan al SLA las incidencias de Telegram.

#### HU-04-05 — Conocer si la resolución cumplió el tiempo comprometido

Cuando el agente documenta la solución y resuelve el ticket, el equipo puede saber si lo hizo dentro del tiempo acordado. El resultado queda asociado al caso para revisar tanto las solicitudes atendidas a tiempo como aquellas que se resolvieron después del vencimiento.

**Para revisar con el equipo:**

- Se utiliza la resolución válida registrada mediante HU-02-05, con su fecha y referencia al caso; un comentario o una notificación no sustituyen ese evento.
- Se compara el tiempo de resolución con el compromiso aplicable, considerando el calendario y las pausas autorizadas.
- Un ticket que se resuelve después del vencimiento conserva el incumplimiento y la fecha real en que fue atendido.
- El cierre posterior no reemplaza la fecha de resolución. Una cancelación no se contabiliza automáticamente como resolución satisfactoria.
- Si el caso se reabre, se mantienen las resoluciones y resultados anteriores. El compromiso de la nueva atención sigue la política acordada y no borra el recorrido previo.

Propuesta para la entrega 1. Se relaciona con HU-04-03, HU-04-06, HU-02-05, HU-02-06 y HU-02-08. Falta acordar el tratamiento de cancelaciones y reaperturas y cómo se interpreta un evento ocurrido exactamente en el límite del compromiso.

#### HU-04-06 — Pausar y reanudar los tiempos cuando corresponda

El equipo puede distinguir las esperas que detienen un compromiso de tiempo de aquellas en las que el conteo continúa. Esto permite explicar cuánto tiempo se consumió realmente según las reglas del servicio, sin tratar todas las esperas de la misma manera.

**Para revisar con el equipo:**

- Solo se pausa un compromiso cuando se cumplen las condiciones y permisos acordados. El estado «en espera» por sí solo no basta.
- Se registra el motivo, el inicio y el compromiso afectado: primera respuesta, resolución o ambos, según la política. También se identifica a la persona o proceso que aplicó la pausa.
- Al reanudar, se registra la fecha y la causa, se conserva el tiempo ya consumido y se actualiza el vencimiento conforme al calendario aplicable.
- Los períodos superpuestos o eventos repetidos no descuentan tiempo dos veces. Los tramos fuera del horario de servicio tampoco se vuelven a descontar como si hubieran sido tiempo laborable.
- Una pausa posterior a un incumplimiento no elimina el atraso que ya ocurrió.
- El equipo puede consultar si el conteo está activo o pausado y por qué, dentro de sus permisos.

Propuesta para la entrega 2, o para la primera si la política inicial admite pausas. Se coordina con la espera de HU-02-04 y utiliza las reglas de EP-09. Falta definir causas, autorizaciones, eventos de reanudación y si se permite corregir una pausa, conservando siempre el registro de la corrección.

#### HU-04-07 — Identificar solicitudes en riesgo o fuera de tiempo

El agente y el supervisor pueden reconocer los tickets que se acercan a su vencimiento y aquellos que ya incumplieron un compromiso. Así pueden intervenir con información concreta sobre qué plazo necesita atención.

**Para revisar con el equipo:**

- Se distinguen los compromisos de primera respuesta y resolución. Cumplir uno no implica que el otro también esté cumplido.
- Los avisos de proximidad se basan en los umbrales configurados; no se aplica un porcentaje o una cantidad de minutos sin acuerdo previo.
- La consulta permite identificar el ticket, el compromiso afectado, su vencimiento y la situación calculada, respetando el acceso de cada persona.
- El seguimiento detecta vencimientos aunque nadie abra el detalle del ticket. Si el conteo está pausado, se respeta la pausa válida y se mantiene visible su motivo.
- Si no hay datos suficientes para calcular, se muestra esa limitación en lugar de clasificar el caso como cumplido.
- Un compromiso completado deja de tratarse como pendiente de atender, pero su resultado de cumplimiento o atraso permanece disponible. Resolver tarde no borra el incumplimiento.

Propuesta para la entrega 1. Utiliza HU-04-03 a HU-04-06 y alimenta HU-04-08 y HU-04-09. Falta acordar los umbrales de riesgo y la frecuencia con la que debe actualizarse la detección. Los indicadores agregados del servicio corresponden a EP-08.

#### HU-04-08 — Escalar un caso que necesita intervención

Cuando una solicitud alcanza una condición de riesgo o incumplimiento definida, el supervisor o nivel de atención correspondiente puede recibir el caso para intervenir. El escalamiento deja claro qué lo originó y qué acción se necesita, sin confundir una alerta con una transferencia ya realizada.

**Para revisar con el equipo:**

- Solo se activa un escalamiento cuando se cumple una regla habilitada. Se conserva el ticket, el compromiso afectado, la condición detectada, la regla y la fecha.
- El destino y la acción corresponden a la política: por ejemplo, avisar a un supervisor o solicitar una transferencia a otro nivel autorizado.
- Si hace falta cambiar la asignación, se utiliza EP-03. El escalamiento no presenta una transferencia como completada mientras esté pendiente o haya fallado.
- Si el destino no está disponible, se deja visible la incidencia para revisión y se mantiene identificable la responsabilidad actual. No se deriva a un destino arbitrario.
- Evaluar repetidamente la misma condición no crea escalamientos duplicados. Un nuevo nivel o recordatorio solo se activa si está previsto por una regla distinta o por las condiciones de repetición acordadas.
- Escalar no reinicia el SLA ni elimina un incumplimiento previo. Si el caso cambia antes de ejecutar una acción pendiente, se revisa si la acción todavía corresponde y se registra el resultado.

Propuesta para la entrega 2, o antes si la política inicial exige escalamiento. EP-09 configura las reglas, EP-03 ejecuta las transferencias y EP-06 entrega los avisos. Falta definir niveles, destinatarios, acciones, repetición y el tratamiento de escalamientos pendientes cuando el problema ya fue atendido.

#### HU-04-09 — Recibir avisos de riesgo, incumplimiento y escalamiento

Las personas responsables pueden recibir los avisos relevantes de tiempo tanto en la aplicación como en Telegram. Cada aviso les permite reconocer el caso y el compromiso afectado para decidir la siguiente acción.

**Para revisar con el equipo:**

- El evento identifica el ticket, el tipo de situación, el compromiso afectado y la fecha, con la información necesaria y permitida para actuar.
- Los eventos clasificados como importantes o relevantes generan avisos en ambos canales mediante EP-06, para los destinatarios autorizados y vigentes.
- Se conserva la referencia al mismo evento en los dos canales. Tener una copia en la aplicación y otra en Telegram es el comportamiento esperado, no un duplicado indebido.
- Si falla Telegram o falta una vinculación válida, el aviso de la aplicación sigue disponible y se registra el envío pendiente o fallido para su recuperación. No se marca como entregado por ambos canales.
- Los reintentos no crean avisos repetidos del mismo evento en un mismo canal. Un recordatorio adicional necesita una regla que lo justifique.
- Recibir o leer un aviso no cuenta como primera respuesta del agente, no cambia el estado del ticket y no resuelve por sí solo el riesgo o incumplimiento.

Propuesta para la entrega 1. EP-04 origina los eventos y EP-06 administra su entrega y seguimiento, con identidades y permisos de EP-05. Se amplía la definición de destinatarios y eventos pendiente en D-08; no se presupone que todos los avisos se envíen al solicitante.

#### HU-04-10 — Revisar cómo cambiaron la prioridad y los tiempos

El agente, supervisor o responsable autorizado puede revisar qué prioridad y SLA tuvo una solicitud, qué pausas se aplicaron y por qué se registró un atraso. Esto permite explicar el resultado con datos del caso y no solo con su situación actual.

**Para revisar con el equipo:**

- El historial conserva las evaluaciones y ajustes de prioridad, políticas y calendarios aplicados, vencimientos, pausas, reanudaciones, respuestas, resoluciones, incumplimientos y escalamientos que correspondan al caso.
- Cada cambio identifica su fecha, la persona o proceso responsable y el motivo cuando aplique. Los recálculos mantienen el resultado anterior y explican el nuevo.
- Se pueden relacionar los resultados con los eventos que los sustentan, como la respuesta integrada de Telegram, la resolución o la transferencia solicitada por escalamiento.
- Cambiar una prioridad, política o calendario no reescribe silenciosamente la historia ni elimina un incumplimiento ocurrido bajo el compromiso anterior.
- Si se corrige un dato erróneo o se incorpora evidencia tardía válida, quedan visibles la corrección, su fundamento y el resultado anterior. No se confunde una corrección documentada con borrar antecedentes.
- La consulta respeta los permisos y no expone mensajes o archivos restringidos a quien solo puede ver datos de tiempos.

Propuesta para la entrega 1, ampliándose con los eventos de las siguientes entregas. Se integra con HU-02-09 y la protección de EP-10; EP-08 utiliza estos datos para sus indicadores. Falta acordar quién puede corregir datos y revisar esa información, junto con la retención ya pendiente en D-09.

### 5.3. Cómo se cubre la épica

| Capacidad de EP-04 | Historias que la cubren | Relación con otras épicas |
| --- | --- | --- |
| Prioridad por impacto y urgencia y ajustes justificados | HU-04-01, HU-04-02 | Criterios de EP-09 y permisos de EP-05 |
| Vencimientos de primera respuesta y resolución | HU-04-03, HU-04-04, HU-04-05 | Configuración de EP-09, atención de EP-02 y comunicación de EP-06 |
| Horarios, días no laborables, pausas y reanudaciones | HU-04-03, HU-04-06 | Calendarios de EP-09 y esperas de HU-02-04 |
| Detección de riesgo e incumplimiento | HU-04-07 | Datos operativos del ticket; indicadores posteriores de EP-08 |
| Escalamiento a supervisores o niveles de atención | HU-04-08 | Transferencias de HU-03-07 y reglas de EP-09 |
| Historial de prioridad, SLA, pausas e incumplimientos | HU-04-10 | Historial de HU-02-09 y protección de EP-10 |
| Avisos relevantes por aplicación y Telegram | HU-04-09 | Entrega de EP-06 y permisos de EP-05 |
| Primera respuesta del agente por Telegram, sin contar avisos automáticos | HU-04-04 | Comunicación de EP-06 |

### 5.4. Lo que falta acordar con el equipo

Los valores y las reglas siguientes deben definirse con los responsables del servicio. No se asignan tiempos, porcentajes ni niveles por defecto en estas historias.

| ID | Decisión necesaria | Historias afectadas |
| --- | --- | --- |
| D-23 | Acordar la matriz de impacto y urgencia, prioridades resultantes, evaluación inicial y permisos para ajustes o excepciones. | HU-04-01, HU-04-02 |
| D-24 | Definir las políticas aplicables, su precedencia, los objetivos de primera respuesta y resolución y el evento de inicio de cada conteo. Precisar cómo se trata un evento ocurrido exactamente al vencer. | HU-04-03, HU-04-04, HU-04-05 |
| D-25 | Acordar zona horaria, horarios laborales, días no laborables y efecto de cambios de política o calendario sobre casos existentes. | HU-04-03, HU-04-06, HU-04-10 |
| D-26 | Definir qué respuesta del agente cuenta como atención, qué evento y fecha la acreditan y cómo se tratan fallos de Telegram o evidencia recibida tarde. | HU-04-04 |
| D-27 | Acordar qué pausas afectan a cada compromiso, quién puede aplicarlas o corregirlas y qué eventos reanudan el conteo. Complementa D-12 sobre esperas. | HU-04-06; HU-02-04 |
| D-28 | Definir el efecto de cambios de prioridad, cancelaciones y reaperturas sobre cada compromiso, conservando resultados anteriores. Complementa D-06 sobre reapertura y D-14 sobre cancelación. | HU-04-02, HU-04-03, HU-04-05 |
| D-29 | Acordar umbrales de riesgo y frecuencia de detección de vencimientos. | HU-04-07 |
| D-30 | Definir reglas, niveles, acciones y repetición de escalamientos, y qué ocurre si una acción pendiente deja de corresponder. Coordinar con D-21 sobre transferencias. | HU-04-08 |
| D-31 | Acordar permisos y procedimiento para corregir datos de tiempos, con fundamento e historial de los resultados anteriores. | HU-04-04, HU-04-06, HU-04-10 |
| D-08, seguimiento | Precisar los eventos de tiempo relevantes, destinatarios y posibles recordatorios por aplicación y Telegram. | HU-04-09 |
| D-09, seguimiento | Aplicar retención y objetivos de calidad al historial y al seguimiento de los compromisos. | HU-04-07, HU-04-10 |

## 6. EP-05 — Gestión de usuarios, roles y accesos

### Objetivo y participantes

Que cada usuario pueda entrar al HelpDesk y utilizar las funciones que necesita para su trabajo, con acceso únicamente a la información que le corresponde. Los cambios de puesto, equipo o participación en la empresa deben reflejarse en sus permisos sin perder la historia de los casos.

Participan todos los usuarios que usan el sistema y los administradores o responsables autorizados para gestionar sus cuentas. Administrar cuentas no implica tener permiso para leer todos los tickets ni para conceder cualquier acceso.

### Alcance y relación con otras épicas

- Las cuentas corresponden a usuarios de una sola empresa. No se incluye registro público ni acceso para clientes, proveedores u otras organizaciones.
- Los roles de referencia son solicitante, agente de soporte, supervisor y administrador. Se pueden combinar cuando las reglas lo autoricen; el alcance también depende del equipo y de la relación con cada caso.
- EP-05 administra identidades, roles y asociaciones con equipos. EP-09 configura los equipos y niveles, y EP-03 decide la asignación operativa de tickets.
- Cada función de las otras épicas debe comprobar los permisos vigentes. Ocultar una opción en pantalla no sustituye la comprobación al consultar datos o ejecutar una acción.
- EP-05 verifica la vinculación entre el usuario y su identidad de Telegram. EP-06 utiliza esa vinculación para la conversación y los avisos, sin convertir Telegram en un canal de creación de tickets.
- EP-10 define los controles técnicos de autenticación, sesiones, protección y auditoría. Aquí se describe la experiencia y el resultado esperado para usuarios y administradores.
- El uso de cuentas locales, un directorio corporativo o inicio de sesión único todavía debe acordarse. Estas historias no eligen una tecnología ni presuponen contraseñas administradas por el HelpDesk.

### 6.1. Mapa del recorrido

El recorrido comienza con la habilitación del usuario y continúa con su acceso, los permisos que necesita y los cambios que puedan surgir durante su participación en el servicio.

| Nivel del mapa | Habilitar al usuario | Entrar y recuperar el acceso | Definir su participación | Conectar Telegram | Mantener los accesos al día |
| --- | --- | --- | --- | --- | --- |
| Tareas del usuario | Registrar y actualizar su cuenta | Iniciar y cerrar sesión; recuperar acceso | Asignar roles y equipos; aplicar permisos | Verificar su identidad y administrar la vinculación | Ajustar permisos o desactivar sin perder antecedentes |
| Entrega 1 propuesta: acceso interno controlado | HU-05-01 Habilitar una cuenta; HU-05-02 Actualizar datos | HU-05-03 Entrar y salir; HU-05-04 Recuperar acceso | HU-05-05 Gestionar roles; HU-05-06 Asociar equipos; HU-05-07 Aplicar permisos | — | HU-05-08 Desactivar una cuenta |
| Entrega 2 propuesta: identidad vinculada a Telegram | — | — | — | HU-05-09 Vincular Telegram; HU-05-10 Cambiar o retirar la vinculación | Aplicar HU-05-07 y HU-05-08 también a la integración |

**Valor de la entrega 1:** los usuarios autorizados pueden usar el HelpDesk con funciones y datos acordes a sus responsabilidades. La administración puede actualizar o retirar accesos preservando los antecedentes.

**Valor de la entrega 2:** los solicitantes y agentes pueden utilizar su identidad verificada en Telegram para conversar y recibir avisos, con un procedimiento para cambiarla o desvincularla.

Esta separación organiza el trabajo, pero no permite liberar una integración sin control de identidad. HU-05-09 y HU-05-10 deben acompañar cualquier primera versión que ya utilice Telegram. Del mismo modo, la aplicación de permisos y la desactivación deben funcionar desde que existan cuentas, no agregarse al final. La recuperación de acceso puede apoyarse en el mecanismo corporativo acordado, sin duplicarlo dentro del HelpDesk.

### 6.2. Historias de usuario

#### HU-05-01 — Habilitar una cuenta para un usuario

El administrador autorizado puede habilitar a un usuario para utilizar el HelpDesk. La cuenta queda asociada a una persona de la empresa y le permite comenzar a usar las funciones que se le hayan concedido.

**Para revisar con el equipo:**

- El alta requiere identificar al usuario mediante los datos y la fuente de verificación que acuerde la empresa. No se habilitan cuentas mediante registro público.
- Se comprueba que los datos obligatorios estén completos y que el identificador de acceso no esté asociado a otra cuenta. Si el usuario ya tiene una cuenta, se informa para evitar duplicar su identidad.
- Los permisos iniciales siguen las reglas aprobadas. Dar de alta una cuenta no concede automáticamente funciones de agente, supervisor o administrador.
- El usuario recibe las indicaciones necesarias para su primer acceso mediante el procedimiento acordado, sin exponer credenciales en registros o mensajes sin protección.
- Se conserva quién o qué proceso realizó el alta y cuándo. Si la operación falla, no se presenta la cuenta como habilitada.

Propuesta para la entrega 1. Se apoya en HU-05-05 y los controles de EP-10. Falta acordar los datos de identificación, quién valida la condición de personal de la empresa, los permisos iniciales y si el alta será manual o provendrá de un directorio corporativo.

#### HU-05-02 — Mantener actualizados los datos del usuario

El administrador autorizado puede corregir o actualizar los datos de una cuenta para que el HelpDesk refleje la información vigente del usuario. La persona sigue siendo la misma en los tickets y actividades que ya había registrado.

**Para revisar con el equipo:**

- Solo se pueden modificar los campos permitidos y se validan los datos obligatorios y los identificadores que deban ser únicos.
- La actualización conserva la identidad interna de la cuenta y las referencias de sus solicitudes, actividades y decisiones anteriores.
- Cambiar datos de contacto o presentación no concede nuevos roles, cambia equipos ni vincula una identidad de Telegram por coincidencia de nombre.
- Si un dato proviene de un directorio corporativo, se respeta la fuente que se acuerde como responsable de mantenerlo y se explica dónde debe corregirse.
- Se registra quién o qué proceso hizo el cambio y cuándo. Si otra persona ya actualizó los datos, se pide revisar la versión vigente antes de reemplazarla.

Propuesta para la entrega 1. Los cambios de roles, equipos y Telegram se realizan mediante sus historias específicas. Falta definir qué datos se pueden editar en el HelpDesk, si el usuario puede actualizar alguno por su cuenta y cómo se presentan nombres anteriores en los registros históricos.

#### HU-05-03 — Entrar al HelpDesk y cerrar la sesión

El usuario puede identificarse para entrar al HelpDesk y encontrar las funciones que tiene autorizadas. Al terminar, puede cerrar su sesión para evitar que otra persona continúe utilizándola en ese dispositivo.

**Para revisar con el equipo:**

- El acceso utiliza el mecanismo de autenticación acordado y requiere una cuenta habilitada. Identificarse correctamente no habilita una cuenta desactivada.
- Después del acceso se muestran las funciones permitidas para el usuario. Las consultas y operaciones vuelven a comprobar sus permisos vigentes.
- Si la autenticación falla, se presenta una indicación comprensible sin revelar información innecesaria sobre otras cuentas.
- Al cerrar sesión, esa sesión deja de permitir nuevas consultas u operaciones protegidas. Volver a una dirección guardada no recupera el acceso sin autenticarse de nuevo.
- Una sesión vencida exige volver a identificarse. El portal no presenta una operación como guardada si no pudo completarse por falta de sesión válida.

Propuesta para la entrega 1. EP-10 establece la protección de credenciales y sesiones. Falta acordar el mecanismo de autenticación, la duración de las sesiones y el comportamiento del cierre cuando se utilice un acceso corporativo compartido con otras aplicaciones.

#### HU-05-04 — Recuperar el acceso a la cuenta

Si un usuario no puede entrar, puede seguir un procedimiento claro para recuperar el acceso a su propia cuenta. El proceso comprueba su identidad antes de permitir cualquier cambio que le devuelva el acceso.

**Para revisar con el equipo:**

- La recuperación utiliza el mecanismo elegido para las cuentas, ya sea del HelpDesk o del proveedor corporativo. El usuario recibe indicaciones sobre dónde continuar.
- No basta con conocer el nombre o identificador de otra persona para recuperar su cuenta. Se exige la verificación acordada.
- Si se utilizan enlaces o códigos temporales, los vencidos o ya utilizados no permiten repetir la recuperación. Sus valores no se exponen en el historial de atención ni en registros de auditoría.
- Recuperar el acceso no reactiva una cuenta deshabilitada ni concede roles o permisos nuevos.
- Si no puede completar la verificación, se indica el procedimiento de asistencia autorizado, sin omitir la comprobación de identidad.

Propuesta para la entrega 1. Se coordina con EP-10 y HU-05-03. Falta acordar el canal de verificación, quién puede prestar asistencia y cómo se tratan las sesiones existentes después de recuperar el acceso. No se presupone que el HelpDesk deba cambiar contraseñas de un directorio externo.

#### HU-05-05 — Asignar y ajustar roles según la responsabilidad del usuario

El administrador con permiso puede asignar los roles que necesita un usuario para realizar su trabajo. Por ejemplo, una persona puede atender solicitudes como agente y también registrar sus propias necesidades como solicitante, si esa combinación está autorizada.

**Para revisar con el equipo:**

- Se pueden asignar los roles de solicitante, agente de soporte, supervisor y administrador, con las combinaciones que permita la empresa.
- Antes de guardar, se comprueba que quien hace el cambio tenga permiso para conceder o retirar esos roles. Tener acceso a la administración no permite ampliar sus propios privilegios sin autorización.
- Se registra la combinación anterior, la nueva, la persona que la modificó, la fecha y el motivo del cambio.
- Los permisos resultantes se aplican también a las siguientes operaciones de una sesión ya abierta. Una pantalla que quedó abierta no conserva una autorización retirada.
- Las combinaciones de roles respetan las restricciones de acceso acordadas. El rol de administrador no implica lectura indiscriminada de tickets, mensajes o archivos.

Propuesta para la entrega 1. Se complementa con HU-05-06 y HU-05-07 y la auditoría de EP-10. Falta acordar la matriz de roles, las combinaciones permitidas, quién puede administrar cada rol y cómo se resuelven permisos que entren en conflicto.

#### HU-05-06 — Asociar agentes y supervisores con equipos y niveles de soporte

El administrador autorizado puede indicar en qué equipos y niveles participa un agente o supervisor. Así el sistema puede mostrarle el trabajo que le corresponde y permitir asignaciones coherentes con su función.

**Para revisar con el equipo:**

- Se seleccionan equipos y niveles habilitados en EP-09 y se comprueba que la asociación sea válida para los roles del usuario.
- Las asociaciones determinan el alcance que corresponda según las reglas de acceso; pertenecer a un equipo no concede automáticamente todas las acciones sobre sus tickets.
- Se conserva el cambio de pertenencia, con su fecha, autor y motivo. Las participaciones anteriores siguen identificables cuando sean necesarias para la trazabilidad.
- Al retirar una asociación, se revisan los accesos vigentes y se identifican los tickets cuya responsabilidad necesita atención. No se transfieren silenciosamente a otro agente.
- La redistribución de los casos pendientes se realiza mediante EP-03. El cambio de equipo no borra el historial del usuario ni le garantiza acceso permanente a los casos anteriores.

Propuesta para la entrega 1. Se relaciona con HU-03-01, HU-03-03, HU-03-06 y HU-03-07. Falta acordar si una persona puede pertenecer a varios equipos o niveles y qué ocurre con sus asignaciones al retirarla de uno de ellos, en coordinación con D-20.

#### HU-05-07 — Acceder únicamente a las funciones y datos autorizados

El usuario puede consultar y utilizar lo que le corresponde según sus roles, equipos y relación con cada caso. Esto le permite trabajar sin acceder a información de otras personas que no necesita conocer.

**Para revisar con el equipo:**

- Las reglas distinguen entre ver información y realizar acciones. Poder consultar un ticket no permite necesariamente asignarlo, cambiar su prioridad, cancelarlo o modificar sus datos.
- En «Mis solicitudes» el solicitante consulta sus propios casos. El acceso operativo a otros tickets depende de permisos específicos; lo mismo ocurre con reportes, artículos y configuración.
- Las restricciones se aplican también a archivos, búsquedas, cantidades, exportaciones y accesos mediante enlaces directos. No basta con ocultar botones o registros en pantalla.
- Las notas internas y sus archivos permanecen restringidos al personal autorizado. La combinación de roles no debe exponerlas a un solicitante sin permiso para ese contenido.
- Se comprueba la autorización vigente al consultar o modificar información y antes de registrar o reenviar contenido mediante la integración. Una asignación anterior o una vinculación de Telegram no sustituyen ese permiso.
- Si se retira un rol, una asociación o un permiso, las siguientes operaciones respetan el cambio y no continúan usando el acceso anterior por una sesión o enlace conservado.

Propuesta para la entrega 1 y requisito de todas las funciones del proyecto. EP-05 define las autorizaciones y EP-10 sus controles técnicos; cada módulo las aplica. Falta completar la matriz de permisos, incluyendo casos en los que un agente o supervisor también es el solicitante del ticket.

#### HU-05-08 — Desactivar una cuenta sin perder su historia

El administrador autorizado puede retirar el acceso de un usuario cuando ya no debe utilizar el HelpDesk. Los tickets y actividades en los que participó se conservan para que el equipo pueda entender quién hizo cada acción y continuar la atención pendiente.

**Para revisar con el equipo:**

- La desactivación requiere permiso y conserva la fecha, el motivo y quién la realizó.
- Desde que se confirma, la cuenta no puede iniciar sesión ni ejecutar nuevas operaciones protegidas mediante sesiones que ya estuvieran abiertas.
- La integración deja de aceptar acciones de esa cuenta y de enviar nuevos contenidos a su identidad de Telegram. Los envíos pendientes se revisan antes de entregarse y no se consideran completados si el destinatario dejó de estar habilitado.
- Los tickets y actividades conservan la referencia al usuario desactivado. La desactivación no elimina sus registros ni cambia su autoría.
- Los casos que tenía asignados quedan identificables para su revisión y redistribución mediante EP-03. No se presentan como resueltos ni se borran por desactivar la cuenta.
- Si falla la desactivación, se comunica el resultado real y no se confirma una revocación que no se aplicó.

Propuesta para la entrega 1, incluyendo la integración en cuanto esté disponible. Se coordina con HU-03-06, HU-03-09, HU-03-10, EP-06 y EP-10. Falta acordar quién autoriza bajas, cómo se revisan las asignaciones pendientes y si habrá reactivación; de habilitarse, deberá definirse qué accesos se vuelven a conceder sin restaurarlos por suposición.

#### HU-05-09 — Vincular una identidad de Telegram de forma verificable

El solicitante o el agente puede conectar su identidad de Telegram con su cuenta del HelpDesk para conversar sobre sus solicitudes y recibir avisos. El proceso confirma que esa identidad le corresponde antes de utilizarla en la atención.

**Para revisar con el equipo:**

- La vinculación requiere una cuenta del HelpDesk habilitada y un procedimiento que compruebe el control de la identidad de Telegram. Escribir un nombre de usuario o un teléfono no basta como verificación.
- La integración utiliza una referencia estable de identidad, sin depender solo del nombre visible que pueda cambiar.
- No se permite que una identidad ya vinculada a otro usuario se reasocie silenciosamente. El conflicto debe resolverse mediante el procedimiento autorizado, sin revelar datos innecesarios de la otra cuenta.
- Hasta completar la verificación, la vinculación se muestra como pendiente y no habilita conversación ni envíos como si ya fuera válida.
- Una vinculación confirmada permite utilizar EP-06 únicamente dentro de los permisos del usuario sobre cada caso. No concede nuevos roles ni acceso a tickets ajenos.
- Se conserva cuándo se confirmó la vinculación y la evidencia necesaria para revisarla, sin guardar secretos o códigos de verificación en el historial visible de los tickets.

Propuesta para la entrega 2, o para cualquier entrega anterior que use Telegram. Habilita HU-01-07 y la comunicación prevista en EP-06. EP-10 protege el proceso. Falta definir el mecanismo de verificación, quién puede iniciarlo y la relación permitida entre cuentas del HelpDesk e identidades de Telegram.

#### HU-05-10 — Cambiar o retirar la vinculación con Telegram

Si el solicitante o el agente cambia de cuenta de Telegram o deja de querer utilizar la vinculada, puede seguir un procedimiento controlado para actualizarla o retirarla. El HelpDesk evita seguir enviando información a una identidad que ya no está autorizada.

**Para revisar con el equipo:**

- El cambio o la desvinculación requieren verificar la identidad y los permisos de quien los solicita. El administrador solo puede intervenir dentro del procedimiento que la empresa autorice.
- Una nueva identidad debe completar la verificación de HU-05-09 antes de quedar habilitada. La anterior deja de tener acceso desde que se confirma su revocación; no se habilitan dos identidades por accidente durante el cambio.
- Antes de aceptar un mensaje o realizar un envío pendiente, EP-06 comprueba la vinculación vigente. Una identidad desvinculada no puede continuar actuando en nombre del usuario ni recibir nuevos contenidos por un reintento.
- Si el usuario queda sin una vinculación válida, puede seguir usando el portal según sus permisos. Los avisos de la aplicación se mantienen y la falta de entrega por Telegram se registra como incidencia, no como envío completado.
- Se conservan fecha, responsable y motivo de la modificación. El resultado informa qué vinculación quedó vigente y cuáles fueron retiradas, sin exponer secretos.

Propuesta para la entrega 2 y parte necesaria de cualquier uso de Telegram. Se coordina con HU-03-10 y EP-06 para los destinatarios y envíos, y con EP-10 para revocación y auditoría. Falta acordar el tratamiento de envíos pendientes hacia una identidad anterior y cómo se verifica al usuario si perdió el acceso a esa cuenta.

### 6.3. Cómo se cubre la épica

| Capacidad de EP-05 | Historias que la cubren | Relación con otras épicas |
| --- | --- | --- |
| Altas, actualizaciones y desactivación de usuarios | HU-05-01, HU-05-02, HU-05-08 | Protección y auditoría de EP-10; redistribución de EP-03 |
| Autenticación y gestión del acceso a la cuenta | HU-05-03, HU-05-04 | Controles de sesiones y recuperación de EP-10 |
| Roles y combinaciones autorizadas | HU-05-05 | Acciones de todas las épicas |
| Asociación con equipos y niveles de soporte | HU-05-06 | Estructura de EP-09 y asignación de EP-03 |
| Visibilidad y acciones según permisos | HU-05-07 | Tickets, reportes, artículos, configuración e integración |
| Referencias históricas a usuarios desactivados | HU-05-02, HU-05-08 | Historial de HU-02-09 y HU-03-09 |
| Vinculación verificable, actualización y desvinculación de Telegram | HU-05-09, HU-05-10 | Acceso de HU-01-07 y comunicación de EP-06 |
| Revocación del acceso y de envíos a identidades no habilitadas | HU-05-07, HU-05-08, HU-05-10 | Destinatarios de HU-03-10, entrega de EP-06 y protección de EP-10 |

### 6.4. Lo que falta acordar con el equipo

Estas definiciones deben mantener coherencia con los permisos que ya se dejaron pendientes en las épicas anteriores. No se presupone que un rol administrativo pueda realizar cualquier operación.

| ID | Decisión necesaria | Historias afectadas |
| --- | --- | --- |
| D-32 | Acordar la fuente de identidad de usuarios, los datos obligatorios y únicos, el mecanismo de alta y la necesidad de directorio corporativo o inicio de sesión único. | HU-05-01, HU-05-02, HU-05-03 |
| D-33 | Definir qué datos se editan en el HelpDesk, quién puede corregirlos y qué fuente prevalece cuando existe directorio corporativo. | HU-05-02 |
| D-34 | Acordar autenticación, duración y cierre de sesiones, recuperación de acceso, asistencia autorizada y efecto de la recuperación sobre sesiones existentes. | HU-05-03, HU-05-04 |
| D-35 | Completar la matriz de roles y permisos, combinaciones válidas, administración de privilegios y resolución de conflictos. Incluir casos donde un agente o supervisor sea también solicitante. | HU-05-05, HU-05-07 |
| D-36 | Definir pertenencia a varios equipos o niveles y efecto de los cambios sobre accesos y asignaciones. Complementa D-17 y D-20. | HU-05-06 |
| D-37 | Acordar autorización de bajas, atención de casos pendientes y posible reactivación con revisión de accesos. Coordinar con D-20. | HU-05-08 |
| D-38 | Definir verificación de Telegram, relación permitida entre identidades y cuentas, resolución de conflictos y asistencia ante pérdida de acceso a la identidad anterior. Complementa D-05. | HU-05-09, HU-05-10 |
| D-39 | Acordar el tratamiento de mensajes y envíos pendientes tras desvincular, cambiar o desactivar una identidad, sin entregar contenido a destinatarios revocados. | HU-05-08, HU-05-10 |
| D-04, D-08 y D-09, seguimiento | Aplicar las reglas de visibilidad, destinatarios y retención a cuentas, vinculaciones y referencias históricas, coordinadas con EP-06 y EP-10. | HU-05-02, HU-05-07 a HU-05-10 |

## 7. EP-06 — Comunicación bidireccional por Telegram y notificaciones

### Objetivo y participantes

Que el solicitante y el agente puedan conversar sobre un ticket por Telegram con el caso identificado, sin que el HelpDesk conserve un historial de los mensajes. Los eventos importantes o relevantes deben llegar a las personas autorizadas tanto en la aplicación como en Telegram, y los fallos de un canal deben quedar identificables para poder recuperarlos.

Participan solicitantes, agentes y supervisores dentro de sus permisos. El personal autorizado para revisar incidencias de comunicación puede dar seguimiento a los envíos, sin obtener por esa función acceso indiscriminado al contenido de los casos.

### Alcance y relación con otras épicas

- La conversación de atención ocurre por Telegram, en ambas direcciones, mediante el mecanismo integrado que se acuerde. No se incluye un chat propio del portal ni se presupone acceso a conversaciones privadas ajenas a la integración.
- Los tickets se crean en el portal. Un mensaje de Telegram no crea un caso ni cambia automáticamente su estado, responsable o prioridad.
- EP-05 verifica y administra las identidades vinculadas. EP-06 comprueba esa vinculación y los permisos vigentes antes de dirigir contenido a un caso.
- EP-06 recibe los mensajes y los dirige al caso correcto, pero no los conserva: ni EP-02 ni EP-01 muestran un historial de la conversación.
- Las notas internas se registran dentro del HelpDesk y nunca se publican en Telegram ni se muestran al solicitante sin el permiso correspondiente.
- Los módulos de tickets, asignación y SLA originan los eventos. EP-09 administra el catálogo de eventos relevantes, las reglas de destinatarios y las plantillas; EP-06 realiza los envíos y sigue sus resultados.
- Una conversación del agente y una notificación automática son elementos distintos. Solo la evidencia que cumpla la definición de EP-04 puede acreditar una primera respuesta de atención.
- EP-10 protege el origen de las comunicaciones, las credenciales, los archivos y los registros de operación. Los tiempos de reintento y otros parámetros todavía deben acordarse.

### 7.1. Mapa del recorrido

El recorrido conecta la identificación del caso con la conversación, las notas internas y la entrega de avisos. El seguimiento de fallos acompaña todo el proceso.

| Nivel del mapa | Identificar el caso | Conversar y aportar información | Compartir contexto interno | Recibir avisos | Resolver incidencias de entrega |
| --- | --- | --- | --- | --- | --- |
| Tareas del usuario | Elegir o confirmar el ticket | Enviar mensajes en ambas direcciones y compartir archivos | Registrar notas internas | Recibir eventos relevantes con destinatarios correctos | Revisar cada canal y recuperar envíos pendientes |
| Entrega 1 propuesta: conversación y avisos trazables | HU-06-01 Identificar el ticket | HU-06-02 Escribir a soporte; HU-06-03 Responder al solicitante | — | HU-06-07 Dirigir contenido autorizado; HU-06-08 Notificar por ambos canales | HU-06-09 Consultar resultados; HU-06-10 Recuperar envíos |
| Entrega 2 propuesta: archivos y colaboración interna | — | HU-06-04 Compartir archivos | HU-06-06 Registrar notas internas | — | Aplicar los mismos controles a archivos y notas |

**Valor de la entrega 1:** solicitante y agente pueden conversar sobre un caso identificado y recibir los avisos relevantes, con resultados de envío que permiten actuar ante fallos.

**Valor de la entrega 2:** se incorporan archivos a la conversación y notas internas para que soporte comparta contexto restringido dentro del HelpDesk.

Las entregas son una propuesta. Ninguna integración debe ponerse en uso sin vinculación verificada, permisos y control de fallos y duplicados. Si la primera versión acepta archivos o ya utiliza notas internas, debe incluir sus historias y controles desde esa entrega. Los avisos relevantes requieren ambos canales desde que se habilite el evento; no se considera suficiente enviar solo por uno.

### 7.2. Historias de usuario

#### HU-06-01 — Identificar el ticket de cada conversación

El solicitante o el agente puede reconocer a qué solicitud corresponde una conversación y confirmar el caso cuando no esté claro. Así evita que una explicación o un archivo termine en otro ticket cuando tiene varias solicitudes abiertas.

**Para revisar con el equipo:**

- Al continuar desde HU-01-07, la integración conserva una referencia clara al ticket seleccionado y comprueba el acceso de la persona.
- Si un intercambio no permite identificar el caso con certeza, se pide seleccionar o confirmar un ticket autorizado antes de dirigirlo a otra persona.
- No se elige automáticamente el último ticket usado ni se supone que un caso es el correcto solo porque esté abierto.
- La selección no revela títulos, identificadores ni contenido de tickets sin permiso. Conocer un número de ticket tampoco habilita la conversación sobre él.
- Si no hay un caso válido al que asociar el mensaje, se orienta al solicitante para consultar o registrar su solicitud en el portal. No se crea un ticket desde Telegram.

Propuesta para la entrega 1. Utiliza las identidades y permisos de EP-05. Falta acordar el mecanismo de selección, cómo se mantiene el contexto entre mensajes y qué ocurre con el contenido recibido mientras se espera una aclaración.

#### HU-06-02 — Enviar información del solicitante a soporte

El solicitante puede escribir por Telegram al equipo que atiende su ticket para explicar mejor el problema o responder una pregunta. El mensaje llega a quienes pueden atender el caso, identificando la solicitud correspondiente.

**Para revisar con el equipo:**

- Se requiere una identidad vinculada y habilitada, acceso al ticket y un origen de comunicación validado por la integración.
- El mensaje se relaciona con el caso mediante HU-06-01 y se dirige según la responsabilidad y los permisos vigentes de HU-06-07.
- Un mensaje sin contenido útil no se presenta como información de atención; los archivos se tratan según HU-06-04 cuando esa capacidad esté habilitada.
- Se distingue entre haber recibido el mensaje en la integración y haberlo enviado al destinatario. Una recepción no se presenta como lectura o respuesta del agente.
- Si falta un agente o no se puede completar el envío, se muestra la situación del envío para su tratamiento; no se dirige a una persona elegida por suposición.
- Escribir un mensaje no modifica automáticamente el estado, la prioridad o el responsable del ticket.

Propuesta para la entrega 1. Complementa la solicitud de información de HU-02-03 y necesita HU-06-07, HU-06-09 y HU-06-10. Falta acordar qué estados permiten conversar y cómo se atienden mensajes de casos sin agente asignado.

#### HU-06-03 — Responder al solicitante desde Telegram

El agente puede responder por Telegram a un solicitante para orientarlo, pedir aclaraciones o explicar una acción de soporte. La respuesta se identifica con el caso para llegar al solicitante correcto.

**Para revisar con el equipo:**

- El agente debe estar vinculado, habilitado y autorizado para atender el caso. Ser agente de soporte no basta para responder en cualquier ticket.
- Antes de dirigir la respuesta, se confirma el ticket y se comprueba la identidad vigente del solicitante. No se usa una vinculación retirada ni un destinatario anterior por conservar un mensaje pendiente.
- La integración identifica al agente autor y la fecha del envío para distinguir la respuesta de un aviso automático; no conserva el contenido del mensaje.
- El resultado visible distingue el procesamiento, el envío y los fallos según la evidencia disponible. Un envío aceptado no se anuncia como leído.
- Los reintentos de la misma respuesta no generan envíos duplicados ni se cuentan como respuestas adicionales de atención.
- Comunicar una solución por Telegram no marca por sí solo el ticket como resuelto. La resolución se registra mediante HU-02-05.

Propuesta para la entrega 1. Se relaciona con HU-04-04 para acreditar la primera respuesta y con HU-06-07, HU-06-09 y HU-06-10. El mecanismo de conversación debe permitir esta dirección además de los mensajes del solicitante.

#### HU-06-04 — Compartir archivos durante la atención

El solicitante y el agente pueden compartir archivos por Telegram cuando ayudan a comprender o resolver el caso, como una captura del problema o una instrucción permitida. Los archivos se reenvían a la otra persona sin guardarse en el ticket.

**Para revisar con el equipo:**

- Los archivos pasan las validaciones acordadas de tipo, tamaño, cantidad y protección antes de reenviarse. Si se rechazan, se explica el motivo que pueda comunicarse.
- Cada archivo aceptado se dirige al caso y a los destinatarios correctos según su autor; no se asocia solo por su nombre de archivo.
- Un enlace directo a un archivo compartido tampoco permite abrirlo o descargarlo sin autorización.
- Los archivos de notas internas o de contenido restringido no se publican en Telegram por incluirlos en una conversación o notificación.
- Si una carga o descarga falla, se identifica el archivo afectado y no se presenta como disponible. Un reintento no crea copias indebidas del mismo adjunto.

Propuesta para la entrega 2, o desde que se acepten archivos por Telegram. Complementa los adjuntos del registro de HU-01-02, con un origen diferente. EP-10 aplica los controles. Falta acordar límites y el tratamiento del mensaje cuando uno de sus archivos falla.

#### HU-06-06 — Registrar notas internas para el equipo de soporte

El agente o supervisor autorizado puede dejar una nota dentro del HelpDesk para compartir contexto de trabajo con otros integrantes autorizados de soporte. Esto permite comentar detalles de la atención que deben permanecer dentro del equipo.

**Para revisar con el equipo:**

- La nota queda asociada al ticket con su autor y fecha, y requiere contenido. Sus archivos, si se habilitan, siguen los controles de protección y permisos.
- Solo el personal con permiso sobre las notas internas del caso puede escribirlas o consultarlas. Tener el rol de soporte no concede acceso a todas las notas de todos los tickets.
- El solicitante sin ese permiso no ve la nota, su contenido en búsquedas, sus adjuntos ni vistas previas, incluso mediante un enlace directo.
- Las notas internas permanecen en el HelpDesk y no se publican en Telegram ni se incluyen como contenido de avisos enviados al solicitante.
- Registrar una nota no cuenta como respuesta al solicitante ni cambia automáticamente el estado, el responsable o la prioridad del ticket.
- La consulta se integra al historial autorizado del ticket, manteniendo clara la diferencia entre nota interna y conversación de atención, que no forma parte del historial.

Propuesta para la entrega 2, o desde que soporte utilice notas internas. Se relaciona con HU-02-02, HU-02-09 y HU-05-07. Falta acordar quién puede corregir notas, si se aceptan adjuntos y cómo se conserva la trazabilidad de sus modificaciones.

#### HU-06-07 — Dirigir la comunicación a destinatarios autorizados

El solicitante o el agente puede confiar en que sus mensajes y avisos se dirigen a las personas que corresponden al caso en ese momento. La integración considera el evento, la relación con el ticket y los permisos actuales, incluso si la responsabilidad cambió después de preparar el envío.

**Para revisar con el equipo:**

- Los destinatarios se determinan según el tipo de intercambio o evento y las reglas configuradas, sin asumir que todos los agentes, supervisores o administradores deben recibirlo.
- Antes de reenviar contenido se comprueban permisos y vinculaciones vigentes. Las cuentas desactivadas y las identidades desvinculadas no reciben nuevos contenidos.
- Una asignación o transferencia actualiza el destino de la comunicación conforme a HU-03-10. Haber sido responsable anteriormente no garantiza seguir recibiendo mensajes.
- Los mensajes pendientes se vuelven a evaluar antes de enviarse. Si cambiaron los destinatarios, se aplica el tratamiento acordado sin reenviar por defecto a la persona anterior.
- Cada destinatario recibe únicamente la información necesaria y autorizada. Una plantilla o vista previa no puede exponer notas internas ni archivos restringidos.
- Si no existe un destinatario válido, se registra la incidencia para revisión. No se elige una cuenta alternativa sin autorización.

Propuesta para la entrega 1. Aplica las reglas de EP-09, las identidades de EP-05 y la responsabilidad de EP-03. Retoma D-08 y D-39 sobre destinatarios y envíos pendientes; el acceso a los registros operativos tampoco concede permiso para leer el contenido restringido.

#### HU-06-08 — Recibir los avisos relevantes en la aplicación y en Telegram

El solicitante, agente o supervisor autorizado puede enterarse de los eventos que necesitan su atención tanto desde el HelpDesk como desde Telegram. Cada aviso identifica el caso y explica qué ocurrió para que la persona sepa dónde continuar.

**Para revisar con el equipo:**

- Se notifican los eventos incluidos en el catálogo aprobado, como registro, asignación, respuesta que requiere atención, cambio de estado, resolución, riesgo o escalamiento, según sus destinatarios definidos.
- Cada evento importante o relevante genera una notificación en la aplicación y otra por Telegram para el destinatario autorizado. Ambas conservan la referencia al mismo evento y ticket.
- El contenido utiliza las plantillas aprobadas y respeta los permisos. El acceso al ticket desde un aviso vuelve a comprobar la autorización actual.
- Los avisos de la aplicación pueden consultarse aunque Telegram esté caído o el solicitante, agente o supervisor destinatario no tenga una vinculación válida. El problema de ese canal queda pendiente o fallido, no completado.
- Recibir un mensaje de conversación no sustituye por suposición la notificación de un evento relevante. Se acuerda qué respuestas generan avisos para evitar mensajes redundantes sin omitir los dos canales requeridos.
- La notificación no cambia el ticket ni cuenta como respuesta de atención del agente. Tampoco genera nuevos avisos de sí misma en un ciclo repetido.

Propuesta para la entrega 1. Recibe los eventos de EP-01 a EP-04 y utiliza HU-06-07, HU-06-09 y HU-06-10. EP-09 administra el catálogo y las plantillas. Falta concretar los eventos y destinatarios, incluyendo cuándo una respuesta necesita un aviso adicional.

#### HU-06-09 — Consultar qué ocurrió con cada envío

El personal autorizado puede revisar si un mensaje o aviso sigue pendiente, fue aceptado por el canal o tuvo un fallo. Esto le permite atender incidencias sin confundir la existencia de un aviso con que el solicitante, agente o supervisor destinatario lo haya leído.

**Para revisar con el equipo:**

- Los mensajes de conversación muestran solo su estado de procesamiento y envío por Telegram, sin su contenido. Las notificaciones muestran resultados separados para la aplicación y Telegram, por destinatario.
- Se conservan las fechas, los intentos, el resultado y una explicación útil del fallo, con referencia al intercambio o evento original.
- Los nombres de los estados reflejan la evidencia disponible. Un envío aceptado por el canal no se presenta como entrega o lectura confirmada si no existe esa evidencia.
- Si solo un canal completó su parte, se distingue del que sigue pendiente o falló. La falta de una vinculación válida se identifica como incidencia de Telegram.
- La consulta protege datos personales, contenido restringido y credenciales. Tener permiso para supervisar fallos no habilita la lectura completa de cualquier ticket.
- Si el resultado de un intento es incierto, se indica esa incertidumbre para su tratamiento; no se marca como éxito ni se presupone un fallo seguro.

Propuesta para la entrega 1. Se relaciona con la evidencia de HU-04-04 y los avisos de HU-04-09. EP-10 protege los registros y EP-09 define los parámetros operativos. Falta acordar los estados de procesamiento y quién puede revisar cada nivel de detalle.

#### HU-06-10 — Recuperar envíos pendientes sin repetir contenido

Cuando un mensaje o aviso no puede completarse, el personal autorizado puede dar seguimiento a su recuperación. La integración permite reintentarlo según las reglas acordadas, conservando lo que ya se completó y evitando duplicados por reprocesamiento.

**Para revisar con el equipo:**

- Los reintentos mantienen la referencia al mismo intercambio o evento y registran cada intento con su resultado. La política distingue fallos recuperables de situaciones que necesitan intervención.
- Antes de reintentar, se comprueban de nuevo el ticket, los permisos, la vinculación y los destinatarios vigentes. Un cambio de cuenta o responsable no deja habilitado al destinatario anterior.
- En una notificación, se recupera el canal o destinatario pendiente sin repetir por defecto el que ya completó el envío. Las copias requeridas en aplicación y Telegram no son duplicados indebidos.
- Reprocesar un mensaje no lo duplica ni lo cuenta como una nueva respuesta del agente.
- Si no se conoce el resultado de un intento anterior, se verifica la evidencia disponible y se aplica el procedimiento acordado antes de repetirlo. No se garantiza una entrega sin duplicados cuando el canal no permite comprobarla; la incertidumbre queda visible para resolverla.
- Agotar los intentos no elimina la incidencia ni la presenta como completada. Se conserva el motivo y se deja disponible el procedimiento de recuperación autorizado.
- El fallo de Telegram no elimina las notificaciones ya disponibles en la aplicación.

Propuesta para la entrega 1. Se apoya en HU-06-07 y HU-06-09. EP-09 configura intervalos y límites; EP-10 contempla la recuperación de pendientes tras una restauración. Falta definir reintentos automáticos, intervención manual, tratamiento de avisos que dejaron de ser pertinentes y resolución de resultados inciertos.

### 7.3. Cómo se cubre la épica

| Capacidad de EP-06 | Historias que la cubren | Relación con otras épicas |
| --- | --- | --- |
| Conversación bidireccional por Telegram | HU-06-02, HU-06-03 | Acceso desde HU-01-07, información de HU-02-03 e identidades de EP-05 |
| Archivos de atención en ambas direcciones | HU-06-04 | Consulta de EP-02 y protección de EP-10 |
| Identificación del ticket y manejo de ambigüedad | HU-06-01 | Tickets de EP-01 y permisos de EP-05 |
| Notas internas restringidas al HelpDesk | HU-06-06 | Historial de HU-02-09 y permisos de HU-05-07 |
| Selección de destinatarios autorizados y vigentes | HU-06-07 | Responsables de HU-03-10, identidades de EP-05 y reglas de EP-09 |
| Notificaciones relevantes por ambos canales | HU-06-08 | Eventos de tickets, asignación y SLA; catálogo de EP-09 |
| Seguimiento independiente de procesamiento y envío | HU-06-09 | Evidencia de HU-04-04 y protección de EP-10 |
| Reintentos y prevención de duplicados | HU-06-10 | Configuración de EP-09 y recuperación de EP-10 |
| Disponibilidad de avisos en la aplicación ante fallos de Telegram | HU-06-08, HU-06-09, HU-06-10 | Vinculaciones de EP-05 y continuidad de EP-10 |

### 7.4. Lo que falta acordar con el equipo

Telegram ya está elegido como canal. Las decisiones pendientes concretan cómo funcionará la integración y cómo se comprobarán sus resultados, sin dar por resuelto un mecanismo técnico todavía no validado.

| ID | Decisión necesaria | Historias afectadas |
| --- | --- | --- |
| D-40 | Definir y validar el mecanismo de conversación en ambas direcciones, la selección del caso y el tratamiento de mensajes ambiguos. Complementa D-05 y D-38 sobre acceso e identidad. | HU-06-01, HU-06-02, HU-06-03 |
| D-41 | Acordar en qué estados se puede conversar y cómo se tratan los casos sin agente o con una transferencia pendiente. | HU-06-02, HU-06-03, HU-06-07 |
| D-42 | Definir límites, validaciones y fallos parciales de los archivos compartidos por Telegram. Coordinar con D-02 y D-09. | HU-06-04 |
| D-44 | Definir quién puede registrar y corregir notas internas, si admiten adjuntos y cómo se conserva su trazabilidad. Coordinar con D-11 y D-35. | HU-06-06 |
| D-45 | Acordar estados de procesamiento y envío, evidencia disponible por canal y permisos para consultar resultados operativos. | HU-06-09 |
| D-46 | Definir intervalos y límites de reintento, recuperación manual, tratamiento de resultados inciertos y de avisos que dejaron de ser pertinentes. | HU-06-10 |
| D-08, seguimiento | Completar el catálogo de eventos relevantes, destinatarios y plantillas; definir qué respuestas generan avisos adicionales sin ciclos ni redundancias innecesarias. | HU-06-07, HU-06-08 |
| D-39, seguimiento | Aplicar a pendientes y reintentos el tratamiento de identidades o responsables que cambiaron, sin enviar contenido a destinatarios revocados. | HU-06-07, HU-06-10 |
| D-09, seguimiento | Acordar retención y objetivos medibles de disponibilidad y tiempos de procesamiento para avisos y registros de fallos. | HU-06-04, HU-06-09, HU-06-10 |

## 8. EP-07 — Base de conocimiento y autoservicio

### Objetivo y participantes

Que los solicitantes puedan encontrar instrucciones y respuestas confiables para resolver dudas frecuentes, y que soporte pueda reutilizar lo aprendido al atender solicitudes. El contenido se prepara, revisa y mantiene para que siga siendo útil y no exponga información de los casos de origen.

Participan solicitantes que consultan artículos, agentes que los redactan y personas autorizadas para revisarlos, publicarlos y mantenerlos. Estas responsabilidades se asignan mediante los permisos de EP-05; no se presupone que todo agente pueda publicar directamente.

### Alcance y relación con otras épicas

- La base de conocimiento es interna para los solicitantes de la empresa. No se incluye un portal público ni generación automática de respuestas.
- Se distinguen artículos generales para solicitantes y contenido restringido al soporte autorizado. Un artículo publicado no es necesariamente visible para todos.
- Los borradores y las revisiones no se presentan como instrucciones publicadas. El equipo debe acordar quién puede revisar y publicar y qué cambios necesitan una nueva revisión.
- EP-02 aporta soluciones documentadas que pueden servir como referencia. Convertirlas en artículos requiere preparar contenido reutilizable y excluir información personal o sensible; no se copia un ticket completo a la base de conocimiento.
- Relacionar un artículo con un ticket no concede acceso al ticket ni al artículo a quien no tenga permiso, y tampoco resuelve el caso automáticamente.
- La consulta de conocimiento no obliga al solicitante a crear un ticket ni elimina la posibilidad de registrar su necesidad mediante EP-01.
- EP-05 controla los permisos y EP-10 protege contenidos y registros. EP-09 administra los catálogos que se acuerden; no se presupone que las categorías de artículos sean idénticas a las de tickets.

### 8.1. Mapa del recorrido

El recorrido combina la consulta del solicitante con el trabajo de soporte para preparar y mantener respuestas confiables.

| Nivel del mapa | Encontrar una respuesta | Preparar conocimiento | Revisar y compartir | Usarlo en la atención | Mantenerlo vigente |
| --- | --- | --- | --- | --- | --- |
| Tareas del usuario | Buscar y leer instrucciones autorizadas | Redactar y clasificar un borrador | Revisar contenido, definir destinatarios y publicar | Relacionar una solución útil con un ticket | Actualizar o retirar contenido y reconocer a su responsable |
| Entrega 1 propuesta: consulta de contenido revisado | HU-07-01 Buscar artículos; HU-07-02 Consultar instrucciones | HU-07-03 Crear y clasificar un borrador | HU-07-04 Revisar; HU-07-05 Publicar; HU-07-06 Definir visibilidad | — | HU-07-09 Retirar contenido obsoleto |
| Entrega 2 propuesta: reutilización y mantenimiento | — | HU-07-08 Preparar un artículo a partir de una solución | Aplicar la revisión y publicación a las actualizaciones | HU-07-07 Relacionar artículos con tickets | HU-07-10 Actualizar artículos y mantener responsables |

**Valor de la entrega 1:** los solicitantes pueden encontrar contenido revisado y permitido para su función. Soporte puede prepararlo y retirarlo si deja de ser confiable.

**Valor de la entrega 2:** el equipo puede reutilizar soluciones de atención y mantener los artículos actualizados con responsables identificables.

Estas entregas son una propuesta. La revisión, los permisos y la posibilidad de retirar contenido deben acompañar la primera publicación. La identificación del autor y la fecha se registra desde el primer borrador; HU-07-10 amplía el mantenimiento posterior. Si el servicio necesita corregir artículos publicados desde su primera versión, esa historia debe incluirse también en la primera entrega.

### 8.2. Historias de usuario

#### HU-07-01 — Buscar artículos que ayuden a resolver una duda

El solicitante puede buscar en la base de conocimiento por título, categoría o palabras clave para encontrar una respuesta relacionada con su problema. Así puede orientarse sin depender siempre de una consulta a soporte.

**Para revisar con el equipo:**

- La búsqueda habitual del solicitante devuelve artículos publicados que tenga permiso de consultar. No muestra borradores, contenido retirado ni artículos restringidos fuera de su alcance.
- Se pueden combinar los criterios acordados y abrir un resultado para leer su contenido. Cada resultado identifica el artículo y su categoría de forma comprensible.
- Los títulos, resúmenes, sugerencias y cantidades mostradas respetan los mismos permisos; no revelan la existencia o contenido de artículos restringidos mediante la búsqueda.
- Si no hay coincidencias, se informa y se permite cambiar o limpiar los criterios. La ausencia de resultados no impide registrar una solicitud de soporte.
- Al retirar un artículo o reducir su visibilidad, deja de aparecer en las consultas de quienes ya no pueden verlo.

Propuesta para la entrega 1. Se relaciona con HU-07-02 y HU-07-06. Falta acordar las categorías, el alcance de la búsqueda por palabras clave, los filtros concretos y el orden de los resultados, sin presuponer búsqueda inteligente.

#### HU-07-02 — Consultar instrucciones y soluciones publicadas

El solicitante puede abrir un artículo y leer una explicación que le ayude a resolver su duda. El contenido presenta el problema al que aplica y las instrucciones o respuestas necesarias para entender qué puede hacer.

**Para revisar con el equipo:**

- Se muestra la versión publicada y autorizada del artículo, con título, contenido, categoría y fecha de actualización. La identificación visible del responsable sigue los permisos acordados.
- Las instrucciones permiten reconocer a qué situación aplican; un artículo no debe presentarse como respuesta válida para cualquier problema parecido.
- El acceso vuelve a comprobarse al abrir un enlace directo o uno compartido desde un ticket. Un enlace no evita las restricciones del artículo.
- Si el artículo fue retirado o ya no está disponible para el solicitante, se informa sin exponer su contenido restringido o presentar instrucciones obsoletas como vigentes.
- Leer el artículo no crea un ticket, no cambia el estado de uno existente y no cuenta como confirmación de que el problema quedó resuelto.

Propuesta para la entrega 1. Aplica HU-05-07 y los controles de EP-10. La consulta puede apoyar al solicitante antes o durante una solicitud de EP-01, sin obligarlo a completar pasos de autoservicio para pedir ayuda.

#### HU-07-03 — Crear y clasificar un borrador de artículo

El agente autorizado puede preparar un artículo con instrucciones, una solución o preguntas frecuentes para que el conocimiento del equipo pueda reutilizarse. Mientras trabaja, el contenido permanece como borrador y no se confunde con información aprobada para los solicitantes.

**Para revisar con el equipo:**

- Se propone registrar título, contenido y categoría, con palabras clave cuando ayuden a encontrarlo. Los campos obligatorios se validan antes de guardar y no aceptan solo espacios.
- El borrador conserva su autor y fechas de creación y modificación. Puede retomarse para continuar la redacción sin publicarlo.
- La categoría debe estar habilitada para su uso. Su elección organiza el contenido, pero no concede permisos de lectura por sí sola.
- Solo las personas autorizadas pueden consultar o editar el borrador. No aparece en la búsqueda habitual de artículos publicados.
- Si otra persona ya modificó el contenido, se informa y se pide revisar la versión vigente antes de reemplazarla. Un fallo al guardar no se presenta como un borrador guardado correctamente.

Propuesta para la entrega 1. Se relaciona con HU-07-04 y HU-07-06. Falta acordar campos obligatorios, categorías, palabras clave y quién puede colaborar en la edición; no se incluyen ediciones simultáneas en tiempo real por defecto.

#### HU-07-04 — Revisar un artículo antes de publicarlo

La persona encargada de revisar puede comprobar que un artículo sea claro, correcto y apropiado para sus destinatarios. Si necesita cambios, puede explicar qué debe corregirse para que el autor lo prepare antes de publicarlo.

**Para revisar con el equipo:**

- Se identifica el contenido enviado a revisión y la persona responsable de revisarlo, según el procedimiento acordado.
- La revisión considera la claridad de las instrucciones, su vigencia, la audiencia y la ausencia de información personal o sensible que no deba publicarse.
- La decisión queda registrada con responsable y fecha. Si se devuelve para corrección, se conserva una explicación útil para el autor.
- La aprobación corresponde al contenido revisado. Modificarlo después no permite presentar los cambios como aprobados sin aplicar las reglas de revisión acordadas.
- Aprobar una revisión no publica el artículo automáticamente, salvo que el equipo acuerde expresamente una acción conjunta y quien la ejecute tenga ambos permisos.

Propuesta para la entrega 1. Se apoya en HU-07-03 y HU-07-05. Falta acordar los responsables, las condiciones de aprobación y si se permite que una misma persona redacte, revise y publique.

#### HU-07-05 — Publicar un artículo aprobado

La persona autorizada puede poner un artículo revisado a disposición de sus destinatarios. El equipo sabe qué contenido quedó publicado y los solicitantes pueden encontrarlo sin acceder a borradores todavía pendientes de revisión.

**Para revisar con el equipo:**

- Antes de publicar se comprueba que el contenido cumple las condiciones de revisión y que la persona tiene permiso para publicarlo con la visibilidad elegida.
- La publicación conserva la fecha, quién la realizó y la versión del contenido que quedó disponible.
- El artículo aparece en las consultas de su audiencia autorizada, manteniendo restringidos los borradores, comentarios de revisión y contenidos internos que no formen parte de la publicación.
- Si el contenido aprobado cambió o falta una condición, se explica el impedimento y no se publica como si ya estuviera revisado.
- Si la publicación falla, se conserva el estado anterior y no se anuncia el artículo como disponible.

Propuesta para la entrega 1. Depende de HU-07-04 y HU-07-06. La publicación no genera por defecto un aviso a toda la empresa; si el equipo la incorpora al catálogo de eventos relevantes, sus avisos se gestionan mediante EP-06 y EP-09.

#### HU-07-06 — Definir quién puede consultar un artículo

La persona autorizada puede indicar si un artículo está dirigido a los solicitantes en general o si contiene información reservada al soporte autorizado. Así cada lector encuentra contenido adecuado para su función sin que se divulguen instrucciones internas restringidas.

**Para revisar con el equipo:**

- La visibilidad se define según las opciones y permisos acordados antes de publicar. Un artículo general sigue siendo interno de la empresa; no se convierte en contenido público.
- Los permisos se comprueban al buscar, abrir o compartir una referencia al artículo. Publicarlo o vincularlo a un ticket no amplía su audiencia.
- Cambiar la audiencia requiere permiso y conserva quién hizo el cambio, cuándo y por qué. Ampliarla debe cumplir la revisión de contenido que corresponda a los nuevos destinatarios.
- Al restringir un artículo, las siguientes consultas respetan la nueva autorización, aunque alguien conserve su enlace o haya accedido anteriormente.
- Pertenecer al soporte no concede por sí solo acceso a cualquier artículo restringido; se aplica el alcance aprobado en EP-05.

Propuesta para la entrega 1. Complementa HU-05-07 y se aplica a todas las historias de esta épica. Falta acordar si el contenido de soporte se restringe también por equipo o nivel y quién puede ampliar o reducir la audiencia.

#### HU-07-07 — Relacionar un artículo con un ticket

El agente autorizado puede relacionar un artículo útil con una solicitud para dejar claro qué conocimiento ayudó durante la atención. Si el artículo está permitido para el solicitante, este puede consultarlo desde su caso y recuperar las instrucciones cuando las necesite.

**Para revisar con el equipo:**

- El agente necesita permiso sobre el ticket y el artículo para crear la relación. Se identifica qué artículo se vinculó, quién lo hizo y cuándo.
- La relación permite consultar el contenido autorizado desde el caso. No copia automáticamente el artículo a un mensaje ni lo envía por Telegram.
- El solicitante solo ve las referencias y el contenido que tenga permitido conocer. Relacionar un artículo interno no revela su título o contenido a quien no puede consultarlo.
- La relación conserva una referencia a la versión utilizada para entender qué instrucciones apoyaron la atención. La consulta de una versión anterior sigue los permisos y reglas de conservación acordados.
- Si el artículo se actualiza o retira, el vínculo mantiene su trazabilidad sin presentar instrucciones retiradas como vigentes. La relación no se elimina silenciosamente del historial.
- Vincular un artículo no sustituye la documentación de la solución de HU-02-05 ni marca el ticket como resuelto.

Propuesta para la entrega 2. Se integra con HU-02-09 y la consulta de EP-01. Falta acordar dónde se muestran los vínculos y cómo se presenta una referencia histórica cuando existe una versión más reciente o el contenido fue retirado.

#### HU-07-08 — Preparar un artículo a partir de una solución de soporte

Después de resolver un caso, el agente autorizado puede aprovechar lo aprendido para preparar una explicación que sirva a otros solicitantes. La solución se transforma en un borrador general, sin trasladar detalles personales o sensibles del ticket original.

**Para revisar con el equipo:**

- El agente debe tener acceso al caso de origen y permiso para crear contenido. Selecciona y redacta la información que resulte reutilizable; no se publica el ticket completo.
- El borrador describe el problema y la solución de forma general, excluyendo nombres, datos personales, credenciales, conversaciones y otros detalles sensibles del caso.
- Los archivos y notas internas del ticket no se copian ni se adjuntan automáticamente al artículo.
- Se conserva una referencia de origen para el personal autorizado cuando corresponda. Esa referencia no concede acceso al ticket ni aparece a lectores sin permiso.
- El borrador pasa por las mismas reglas de revisión, visibilidad y publicación que cualquier otro artículo. Que una solución haya funcionado en un caso no la convierte por sí sola en contenido aprobado.

Propuesta para la entrega 2. Utiliza HU-02-05, HU-07-03 y HU-07-04, con protección de EP-10. No incluye generación automática de textos o respuestas. Falta acordar cómo se registra la referencia al caso de origen y quién verifica que no se publique información sensible.

#### HU-07-09 — Retirar contenido que ya no debe utilizarse

El responsable autorizado puede retirar un artículo que quedó obsoleto, contiene un error o ya no corresponde al servicio. Los solicitantes dejan de encontrarlo como una respuesta vigente y el equipo conserva el contexto de su retiro.

**Para revisar con el equipo:**

- El retiro requiere permiso y un motivo. Se conservan la fecha y la persona que lo realizó.
- El artículo deja de aparecer como contenido vigente en las búsquedas y consultas habituales de su audiencia.
- Un enlace guardado o asociado a un ticket no permite presentar el artículo retirado como si siguiera publicado. Se informa su indisponibilidad sin exponer contenido restringido.
- El retiro no borra silenciosamente la relación con tickets ni los registros de autoría, revisión o publicación. La conservación y el acceso histórico siguen las políticas acordadas.
- Si se permite volver a publicar, el artículo debe cumplir nuevamente las condiciones de revisión y publicación aplicables; no se reactiva por abrir un enlace antiguo.

Propuesta para la entrega 1. Se relaciona con HU-07-05, HU-07-07 y EP-10. Falta acordar quién puede retirar contenido de forma inmediata, el acceso a versiones retiradas y el procedimiento para una posible republicación.

#### HU-07-10 — Actualizar artículos y mantener un responsable identificable

La persona responsable puede revisar sus artículos y preparar cambios cuando las instrucciones ya no coinciden con la operación del servicio. El equipo puede saber quién mantiene cada contenido y cuándo se actualizó por última vez, para evitar que el conocimiento quede sin seguimiento.

**Para revisar con el equipo:**

- Se conserva un responsable de mantenimiento y las fechas de actualización. Las personas autorizadas pueden consultar esa información para organizar la revisión del contenido.
- Editar un artículo publicado prepara cambios que no se muestran como instrucciones aprobadas antes de completar la revisión correspondiente. Si el contenido vigente es incorrecto, puede retirarse mediante HU-07-09 mientras se corrige.
- Al publicar la actualización, se identifica la versión vigente y se conservan los antecedentes necesarios para explicar qué cambió, quién lo cambió y cuándo.
- No se sobrescribe silenciosamente el contenido que sirvió de referencia a tickets anteriores. Las referencias históricas se tratan como se acuerde en HU-07-07.
- Si el responsable cambia de función o se desactiva, la autoría histórica se mantiene y el contenido que necesita un nuevo responsable queda identificable para revisión autorizada.
- Las modificaciones concurrentes se revisan antes de reemplazar cambios ajenos. Un fallo de guardado o publicación no se presenta como actualización completada.

Propuesta para la entrega 2, o desde la primera si se requiere actualizar contenido publicado. Se apoya en HU-07-03 a HU-07-06 y en los cambios de cuentas de EP-05. Falta acordar cómo se asigna o sustituye al responsable, si habrá revisiones periódicas y qué cambios requieren una nueva aprobación. No se presupone una caducidad automática.

### 8.3. Cómo se cubre la épica

| Capacidad de EP-07 | Historias que la cubren | Relación con otras épicas |
| --- | --- | --- |
| Artículos con instrucciones, soluciones y preguntas frecuentes | HU-07-02, HU-07-03, HU-07-10 | Identidades de EP-05 y protección de EP-10 |
| Clasificación y búsqueda por título, categoría o palabras clave | HU-07-01, HU-07-03 | Catálogos acordados en EP-09 |
| Borradores, revisión, publicación y retiro | HU-07-03, HU-07-04, HU-07-05, HU-07-09 | Roles y permisos de EP-05 |
| Relación entre artículos y tickets | HU-07-07 | Historial de HU-02-09 y consulta de EP-01 |
| Contenido general y contenido restringido al soporte | HU-07-06 | Autorización de HU-05-07 y protección de EP-10 |
| Reutilización de soluciones sin divulgar información sensible | HU-07-08 | Solución de HU-02-05 y protección de EP-10 |
| Responsables y fechas para mantener el conocimiento | HU-07-03, HU-07-05, HU-07-10 | Cambios de usuarios de EP-05 |

### 8.4. Lo que falta acordar con el equipo

Las definiciones siguientes concretan la organización editorial y la consulta del conocimiento, sin dar por aprobados nuevos roles, automatizaciones o accesos públicos.

| ID | Decisión necesaria | Historias afectadas |
| --- | --- | --- |
| D-47 | Acordar campos obligatorios, categorías, palabras clave, criterios de búsqueda y orden de resultados. Definir si las categorías se comparten con los tickets. | HU-07-01, HU-07-03 |
| D-48 | Definir quién redacta, revisa y publica, las condiciones de aprobación y si una persona puede asumir varias de estas responsabilidades. Coordinar con D-35. | HU-07-03, HU-07-04, HU-07-05 |
| D-49 | Acordar las audiencias permitidas y el alcance por equipo o nivel del contenido restringido, junto con los permisos para cambiar su visibilidad. | HU-07-02, HU-07-06 |
| D-50 | Definir cómo se relacionan artículos y versiones con tickets y cómo se consultan referencias cuando el contenido cambia o se retira. | HU-07-07, HU-07-09, HU-07-10 |
| D-51 | Acordar la referencia al caso de origen y la revisión que excluye información personal o sensible antes de publicar una solución reutilizada. | HU-07-08 |
| D-52 | Definir retiro, acceso histórico y posible republicación de artículos, incluyendo quién puede retirar contenido que requiere atención inmediata. | HU-07-09 |
| D-53 | Acordar responsables de mantenimiento, sustitución ante cambios de personal, revisiones periódicas y tratamiento de las actualizaciones de contenido publicado. | HU-07-10 |
| D-09, seguimiento | Aplicar retención, accesibilidad, usabilidad y objetivos de rendimiento a artículos, versiones, búsquedas y referencias históricas. | Todas las historias pertinentes |

## 9. EP-08 — Reportes, tableros y satisfacción del solicitante

### Objetivo y participantes

Que los responsables del soporte puedan entender cuántas solicitudes llegan, cómo se distribuye el trabajo, cuánto tarda la atención y cómo la perciben los solicitantes. La información debe permitir reconocer problemas y oportunidades de mejora, con resultados que puedan explicarse a partir de los registros del servicio.

Participan supervisores y responsables del servicio con permisos de consulta, y los solicitantes que decidan valorar la atención recibida. El acceso a un tablero no concede por sí solo permiso para consultar todos los tickets ni para exportar cualquier dato.

### Alcance y relación con otras épicas

- EP-08 consulta y presenta la información operativa; no cambia estados, responsables, prioridades ni políticas para mejorar un resultado mostrado.
- EP-02 aporta el recorrido del ticket, sus soluciones, cierres y reaperturas. EP-03 aporta la distribución del trabajo; su vista operativa de carga se complementa aquí con el análisis del servicio.
- EP-04 aporta los compromisos y la evidencia de primera respuesta, resolución, pausas e incumplimientos. Los reportes utilizan esas reglas y no inventan un cálculo alternativo de SLA.
- Las respuestas del agente por Telegram se acreditan conforme a EP-04 mediante su marca de tiempo, sin conservar el contenido del mensaje. Las notificaciones automáticas y los mensajes reprocesados no cuentan como nuevas intervenciones del agente.
- Las encuestas son voluntarias y admiten un comentario opcional. Una encuesta sin respuesta no equivale a satisfacción ni a insatisfacción.
- EP-05 y EP-10 controlan el acceso a indicadores, detalles, comentarios y exportaciones. Las consultas y cantidades deben respetar el alcance autorizado.
- Las fórmulas, los períodos, la población incluida y el tratamiento de esperas y reaperturas deben acordarse antes de implementar los indicadores. No se presuponen metas, escalas de satisfacción ni comparaciones de productividad.

### 9.1. Mapa del recorrido

El recorrido comienza con una visión del servicio, continúa con el análisis de casos y tiempos y se completa con la opinión de los solicitantes y la posibilidad de compartir reportes autorizados.

| Nivel del mapa | Conocer la situación | Analizar demanda y trabajo | Revisar tiempos y compromisos | Escuchar al solicitante | Compartir resultados |
| --- | --- | --- | --- | --- | --- |
| Tareas del usuario | Consultar indicadores y elegir el alcance | Reconocer categorías frecuentes y distribución de casos | Revisar primera respuesta, resolución y SLA | Recibir una invitación, responder y consultar resultados | Exportar información permitida |
| Entrega 1 propuesta: visibilidad operativa | HU-08-01 Consultar el tablero; HU-08-02 Filtrar información | HU-08-03 Analizar la demanda; HU-08-04 Revisar la carga | HU-08-05 Consultar tiempos; HU-08-06 Revisar cumplimiento de SLA | — | — |
| Entrega 2 propuesta: satisfacción y reportes compartidos | Aplicar los filtros a los nuevos resultados | — | — | HU-08-07 Recibir una invitación; HU-08-08 Valorar la atención; HU-08-09 Consultar satisfacción | HU-08-10 Exportar reportes |

**Valor de la entrega 1:** los responsables pueden reconocer acumulaciones, cambios en la demanda y dificultades de atención con indicadores explicables y limitados a su alcance.

**Valor de la entrega 2:** el servicio incorpora la percepción voluntaria del solicitante y permite compartir resultados mediante archivos autorizados.

Las entregas son una propuesta. Los indicadores requieren datos operativos y fórmulas aprobadas; un cálculo pendiente no debe mostrarse como un resultado válido. Las encuestas necesitan un momento de invitación definido y, si esa invitación forma parte del catálogo de eventos relevantes, su entrega por aplicación y Telegram mediante EP-06. La protección de datos acompaña ambas entregas.

### 9.2. Historias de usuario

#### HU-08-01 — Consultar un panorama del servicio

El supervisor o responsable autorizado puede abrir un tablero para conocer las solicitudes recibidas, pendientes, resueltas, cerradas y reabiertas. Esta vista le ayuda a reconocer la situación general antes de revisar los casos que requieren más atención.

**Para revisar con el equipo:**

- Cada indicador identifica qué cuenta, qué período o fecha de corte utiliza y cuándo se actualizaron los datos.
- Se distingue entre eventos ocurridos durante un período y la cantidad de casos que están en una situación a una fecha determinada. Los pendientes no se calculan solo a partir de las solicitudes creadas en el período si existen casos anteriores todavía abiertos.
- Un ticket puede aparecer en indicadores distintos por haber sido recibido, resuelto y cerrado en el mismo período. No se presenta la suma de esas cantidades como si fueran tickets únicos.
- Las reaperturas se reconocen por los eventos del historial, sin exigir un estado llamado «reabierto». Se aclara si se cuentan casos distintos o eventos de reapertura.
- Solo se presentan datos dentro del alcance autorizado. Un error de carga o falta de información no se muestra como cero solicitudes.
- Cuando se permite revisar el detalle que explica una cifra, la consulta mantiene el mismo período, definición y alcance, sin conceder acceso adicional al contenido restringido.

Propuesta para la entrega 1. Utiliza el historial de EP-02 y los permisos de EP-05. Falta acordar la definición de cada indicador, los estados considerados pendientes y la frecuencia de actualización.

#### HU-08-02 — Filtrar la información que se necesita revisar

El responsable puede elegir un período, categoría, prioridad, equipo y otros criterios autorizados para concentrarse en la parte del servicio que necesita analizar. Los resultados dejan claro qué selección está utilizando para evitar comparar cifras de alcances distintos.

**Para revisar con el equipo:**

- Los filtros disponibles y sus opciones respetan los permisos de la persona. No permiten descubrir equipos, personas o casos fuera de su alcance.
- Los criterios elegidos se combinan y se muestran junto a los resultados. Al limpiarlos, se vuelve al alcance inicial autorizado.
- Se indica qué fecha utiliza cada indicador: creación, resolución, cierre u otra definida. Seleccionar un período no cambia silenciosamente el significado de la métrica.
- Las fechas se interpretan con la zona horaria y los límites acordados. Un rango cuya fecha inicial sea posterior a la final requiere corrección antes de consultar.
- Si no hay coincidencias, se informa como ausencia de datos para esos filtros, diferenciándola de un fallo de consulta.
- El detalle y la exportación conservan los filtros utilizados, sujetos a sus respectivos permisos.

Propuesta para la entrega 1. Aplica a las demás consultas de EP-08. Falta acordar los filtros específicos, la selección inicial y si categoría, prioridad y equipo se evalúan con su valor actual o con el que tenían al ocurrir el evento analizado.

#### HU-08-03 — Reconocer cómo cambia la demanda de soporte

El responsable puede revisar cuántas solicitudes llegan y qué categorías se repiten a lo largo del tiempo. Esto le permite identificar necesidades frecuentes y períodos de mayor demanda para orientar mejoras del servicio.

**Para revisar con el equipo:**

- Se muestra el volumen de solicitudes recibidas por los períodos y categorías acordados, con la definición de qué casos se incluyen.
- Cada solicitud se cuenta una sola vez como recibida. Una transferencia, reapertura o mensaje adicional no se presenta como un ticket nuevo.
- Los períodos comparados indican su duración y si están completos. No se presenta un período parcial como directamente equivalente a uno completo sin señalarlo.
- Los casos sin clasificación y las categorías desactivadas mantienen un tratamiento explícito; no desaparecen de los totales por falta de una categoría vigente.
- Si una categoría cambió durante la atención, se aplica la regla acordada para el análisis y se informa qué clasificación se utilizó.
- Los resultados permiten identificar patrones, sin afirmar por sí solos cuál fue la causa del aumento o disminución de solicitudes.

Propuesta para la entrega 1. Se apoya en los registros de EP-01, el historial de EP-02 y los catálogos de EP-09. Falta definir la agrupación temporal y el tratamiento histórico de cambios de categoría.

#### HU-08-04 — Analizar la distribución y acumulación del trabajo

El supervisor puede revisar cómo se reparte el trabajo entre equipos y agentes para reconocer concentraciones de casos y solicitudes que siguen sin responsable. Puede distinguir la carga actual de lo que ocurrió en períodos anteriores cuando exista evidencia para reconstruirlo.

**Para revisar con el equipo:**

- La vista identifica si muestra la situación actual o una fecha de corte histórica y qué estados considera como trabajo pendiente.
- Se distinguen casos sin equipo, con equipo pero sin agente y con agente asignado, según las situaciones permitidas por el servicio.
- Las cantidades por equipo o agente se basan en la responsabilidad que corresponda al momento analizado. Una transferencia no duplica un ticket dentro de un mismo total.
- Si se presenta actividad de varios responsables durante un período, se aclara que un caso pudo pasar por más de uno y que sus subtotales no necesariamente suman tickets únicos.
- Las referencias a equipos o usuarios desactivados se conservan cuando forman parte del período consultado, respetando los permisos.
- El número de tickets no se presenta por sí solo como esfuerzo, productividad o calidad del agente. Consultar el análisis no reasigna trabajo.

Propuesta para la entrega 1. Complementa la vista operativa de HU-03-05 y utiliza HU-03-09. Falta acordar los cortes históricos disponibles, las agrupaciones y la atribución de trabajo ante transferencias, en coordinación con D-19.

#### HU-08-05 — Consultar los tiempos de primera respuesta y resolución

El responsable puede revisar cuánto tarda el servicio en responder y resolver las solicitudes. La información distingue ambas etapas para que una respuesta rápida no oculte un problema de resolución, ni una resolución posterior cambie lo que ocurrió al iniciar la atención.

**Para revisar con el equipo:**

- Los tiempos provienen de los eventos y reglas de EP-04, con los horarios, pausas y unidades acordados. La consulta indica si utiliza tiempo de servicio o tiempo transcurrido de calendario.
- La primera respuesta se acredita con la marca de tiempo de la intervención válida del agente por Telegram. Los avisos automáticos, mensajes del solicitante y reprocesamientos no se cuentan como nuevas respuestas.
- La resolución utiliza el evento válido de EP-02; el cierre posterior no sustituye su fecha.
- Los casos sin respuesta o resolución todavía se distinguen de los ya completados. Su falta de duración final no se convierte en cero ni se mezcla silenciosamente con los tiempos terminados.
- Cada resultado agregado identifica cuántos casos o ciclos se incluyeron y qué datos se excluyeron o no pudieron calcularse. No se publica un promedio, mediana u otra medida sin definir su fórmula y población.
- Las reaperturas y las correcciones de evidencia siguen el tratamiento acordado, conservando la posibilidad de explicar el resultado a partir del historial.

Propuesta para la entrega 1. Utiliza HU-04-03 a HU-04-06 y HU-04-10. Falta acordar las medidas estadísticas, la población analizada y el tratamiento de ciclos de atención y datos incompletos.

#### HU-08-06 — Revisar el cumplimiento y los incumplimientos de SLA

El supervisor puede consultar en qué medida se cumplieron los compromisos de primera respuesta y resolución y qué casos presentan atrasos. Esto le permite revisar resultados con evidencia y orientar acciones de mejora.

**Para revisar con el equipo:**

- Se presentan por separado los compromisos de respuesta y resolución. Cumplir uno no implica cumplir ambos.
- Los resultados se basan en las políticas y eventos conservados por EP-04. Un cambio posterior de prioridad o configuración no elimina un incumplimiento previo.
- Se distinguen compromisos cumplidos, incumplidos, todavía pendientes y aquellos sin datos suficientes o sin SLA aplicable. Estar pendiente y aún dentro del plazo no se presenta como cumplimiento ya conseguido.
- Cualquier porcentaje informa el numerador, el denominador y las exclusiones acordadas. Si no existen compromisos evaluables, se muestra que no hay base para calcularlo, no un cumplimiento del cien por ciento.
- Una resolución tardía conserva el incumplimiento aunque el caso ya no esté pendiente. Las cancelaciones y reaperturas siguen las reglas de medición aprobadas.
- La consulta permite revisar la evidencia autorizada de los casos incluidos sin modificar sus datos ni las políticas del servicio.

Propuesta para la entrega 1. Utiliza HU-04-07 y HU-04-10. Falta acordar cómo se agrupan compromisos y ciclos, qué población integra cada porcentaje y cómo se presentan casos con varios incumplimientos.

#### HU-08-07 — Recibir una invitación para valorar la atención

Al concluir un caso, el solicitante puede recibir una invitación para compartir cómo fue su experiencia con soporte. La invitación identifica la solicitud y deja claro que responder es voluntario.

**Para revisar con el equipo:**

- La invitación se genera al ocurrir el evento de conclusión que acuerde el servicio, sin asumir que resolución y cierre son equivalentes.
- Se asocia al solicitante y al ticket o ciclo de atención definido. Otro participante del caso no queda habilitado para responder en su nombre.
- La invitación explica su carácter voluntario y permite acceder a la encuesta mediante el mecanismo autorizado.
- Reprocesar el mismo evento no genera invitaciones o encuestas duplicadas. Una reapertura no crea automáticamente otra encuesta sin una regla que lo permita.
- Si el evento se clasifica como importante o relevante, EP-06 envía el aviso tanto en la aplicación como en Telegram. Un fallo de entrega no se interpreta como respuesta del solicitante.
- La falta de respuesta no impide concluir el caso ni modifica su estado, prioridad o cumplimiento de SLA.

Propuesta para la entrega 2. Se apoya en EP-02, EP-05 y EP-06. Falta acordar el momento de invitación, los casos elegibles, la vigencia de la encuesta y los posibles recordatorios, sin fijar un plazo por defecto.

#### HU-08-08 — Valorar la atención recibida

El solicitante puede indicar cómo percibió la atención de su caso y, si lo desea, dejar un comentario. También puede decidir no responder, sin que eso se tome como una opinión positiva o negativa.

**Para revisar con el equipo:**

- La encuesta identifica el caso y permite elegir una valoración dentro de la escala acordada. El comentario es opcional y no se exige para enviar una valoración válida.
- Se comprueba que la persona esté autorizada para responder esa encuesta y que siga disponible según las reglas acordadas. Conocer o compartir el enlace no permite responder por otro solicitante.
- Abrir la encuesta o dejarla incompleta no genera una valoración. Solo un envío válido y confirmado se registra como respuesta.
- Reintentar el mismo envío no aumenta el número de respuestas. Si se permite corregir una valoración, se conserva su trazabilidad y se aplica la regla acordada sin contar dos respuestas independientes.
- Se informa al solicitante el tratamiento de su respuesta y quién puede consultar su comentario. No se promete anonimato sin una decisión y un mecanismo que lo respalden.
- La respuesta queda asociada al caso o ciclo definido y no cambia el ticket ni sus resultados de atención. Un error al guardar no se anuncia como valoración recibida.

Propuesta para la entrega 2. Complementa HU-08-07 y utiliza los permisos de EP-05 y la protección de EP-10. Falta acordar escala, límites del comentario, posibilidad de corrección y visibilidad de los datos del encuestado.

#### HU-08-09 — Consultar la satisfacción junto con la participación

El responsable puede revisar las valoraciones de los solicitantes y saber cuántas personas respondieron. Así interpreta la satisfacción conociendo la participación que respalda el resultado y puede revisar los comentarios que tenga permitido consultar.

**Para revisar con el equipo:**

- Los resultados de satisfacción incluyen únicamente respuestas válidas, con la distribución de valoraciones y el número de respuestas que las sustentan.
- Se muestran el volumen de encuestas y la tasa de respuesta, indicando qué población se utiliza como denominador. Se distinguen invitaciones generadas, su situación de entrega y respuestas recibidas cuando sea necesario para explicar la participación.
- Una encuesta sin respuesta no se convierte en una valoración ni se incluye como cero en el cálculo de satisfacción. Si no hay respuestas, se informa esa ausencia en lugar de mostrar un resultado positivo o negativo.
- Si el denominador de la tasa de respuesta es cero, se indica que no puede calcularse. Las copias de una invitación en dos canales y los reintentos no duplican encuestas ni participantes.
- Los filtros y períodos indican si agrupan por conclusión del caso, invitación o fecha de respuesta, según la definición acordada.
- Los comentarios y cualquier detalle identificable respetan permisos específicos. El acceso a un resultado agregado no concede acceso automático a comentarios o identidades.
- El resultado se presenta como la percepción de quienes respondieron, sin afirmar que representa necesariamente a todos los solicitantes atendidos.

Propuesta para la entrega 2. Utiliza HU-08-07 y HU-08-08. Falta acordar la fórmula de satisfacción, el denominador de participación, el tratamiento de encuestas vencidas y las restricciones para grupos con pocas respuestas.

#### HU-08-10 — Exportar un reporte autorizado

El responsable con permiso puede descargar los resultados que está revisando para compartirlos o analizarlos fuera del HelpDesk. El archivo permite entender qué datos contiene y conserva los límites de acceso de la consulta.

**Para revisar con el equipo:**

- Exportar requiere un permiso específico y no amplía el alcance de lectura. Se vuelven a comprobar los accesos al generar y descargar el archivo.
- El reporte identifica el período, los filtros, la fecha de generación y el corte de datos utilizado. Sus cifras coinciden con la consulta para ese mismo corte o explican si los datos se actualizaron.
- Solo se incluyen las columnas y el nivel de detalle autorizados. Comentarios de encuestas, información personal y contenido de tickets no se agregan por defecto a una exportación de indicadores.
- Las definiciones necesarias para interpretar los resultados acompañan al reporte, incluidos datos no calculables y exclusiones relevantes. No se reemplazan por ceros para completar el archivo.
- Los enlaces de descarga, si se utilizan, no eluden los permisos. EP-10 aplica protección al archivo y al contenido exportado según el formato elegido.
- Si la generación falla o queda incompleta, se informa y no se presenta un archivo parcial como un reporte completo. La exportación no modifica los datos operativos.

Propuesta para la entrega 2. Aplica HU-05-07 y los controles de EP-10. Falta acordar formatos, campos, límites de volumen, conservación de archivos generados y permisos para exportar información detallada.

### 9.3. Cómo se cubre la épica

| Capacidad de EP-08 | Historias que la cubren | Relación con otras épicas |
| --- | --- | --- |
| Indicadores de recibidos, pendientes, resueltos, cerrados y reabiertos | HU-08-01 | Registro de EP-01 e historial de EP-02 |
| Carga por equipo o agente, categorías y evolución de la demanda | HU-08-03, HU-08-04 | Asignaciones de EP-03 y categorías de EP-09 |
| Tiempos de primera respuesta y resolución | HU-08-05 | Evidencia y reglas de EP-04 |
| Cumplimiento e incumplimiento de SLA | HU-08-06 | Resultados e historial de EP-04 |
| Tiempos de respuesta por Telegram sin contar avisos ni reprocesamientos | HU-08-05 | HU-04-04 y comunicación de EP-06 |
| Filtros por período, categoría, prioridad, equipo y criterios autorizados | HU-08-02 | Datos operativos y permisos de EP-05 |
| Valoración voluntaria y comentario opcional al concluir el caso | HU-08-07, HU-08-08 | Conclusión de EP-02 y avisos de EP-06 |
| Satisfacción con volumen y tasa de respuesta | HU-08-09 | Encuestas válidas y resultados de entrega de EP-06 |
| Exportación según permisos | HU-08-10 | Autorización de EP-05 y protección de EP-10 |

### 9.4. Lo que falta acordar con el equipo

Las definiciones de medición deben permitir que dos personas obtengan el mismo resultado al usar los mismos datos, período y permisos. Se continúa la numeración de decisiones del documento.

| ID | Decisión necesaria | Historias afectadas |
| --- | --- | --- |
| D-54 | Definir cada indicador de volumen, eventos frente a casos únicos, estados pendientes, fecha de corte y frecuencia de actualización. | HU-08-01 |
| D-55 | Acordar filtros, períodos, zona horaria, fecha utilizada por indicador y valores actuales o históricos de categoría, prioridad y equipo. | HU-08-02, HU-08-03, HU-08-04 |
| D-56 | Definir atribución de carga y actividad en transferencias, cortes históricos disponibles y tratamiento de equipos o agentes desactivados. Complementa D-19. | HU-08-04 |
| D-57 | Acordar medidas de tiempos, población incluida, unidades, pausas, casos sin evento final, evidencia tardía y ciclos reabiertos. Coordinar con D-24 a D-28. | HU-08-05 |
| D-58 | Definir numeradores, denominadores y exclusiones de cumplimiento, tratamiento de pendientes, cancelaciones y múltiples compromisos o ciclos por caso. | HU-08-06 |
| D-59 | Acordar evento de invitación, elegibilidad, vigencia, recordatorios y tratamiento de reaperturas para las encuestas. Coordinar los avisos con D-08. | HU-08-07 |
| D-60 | Definir escala de valoración, límites del comentario, correcciones y tratamiento de identidad y visibilidad de respuestas. | HU-08-08 |
| D-61 | Acordar fórmula de satisfacción, denominador de participación, períodos de análisis, encuestas vencidas y protección de grupos con pocas respuestas. | HU-08-09 |
| D-62 | Definir formatos, columnas, límites y conservación de exportaciones, así como permisos para detalle, comentarios e información personal. | HU-08-10 |
| D-35 y D-09, seguimiento | Aplicar permisos, retención y objetivos de calidad a tableros, consultas, encuestas y archivos de reporte. | Todas las historias pertinentes |

## 10. EP-09 — Administración y configuración del servicio

### Objetivo y participantes

Que los responsables autorizados puedan adaptar los catálogos y las reglas del HelpDesk a la operación de la empresa. Cada ajuste debe tener un efecto comprensible y conservar la coherencia de los casos que ya existen y de su historia.

Participan administradores y responsables del servicio con permisos específicos de configuración. Poder modificar un catálogo no concede automáticamente acceso a credenciales, permisos de usuarios o contenido de tickets.

### Alcance y relación con otras épicas

- EP-09 configura opciones dentro de las capacidades previstas del sistema. No permite diseñar procesos ilimitados ni incorporar cualquier automatización sin desarrollo adicional.
- EP-02 ejecuta las transiciones de estado; EP-03 aplica la asignación y el enrutamiento; EP-04 calcula tiempos y escalamientos; EP-06 realiza la comunicación y los envíos.
- EP-05 administra las cuentas, los roles y la pertenencia de agentes y supervisores a equipos. Aquí se mantiene la estructura de equipos y niveles, sin reasignar personas o casos por editar su nombre.
- Los eventos clasificados como importantes o relevantes deben notificarse por aplicación y Telegram. La configuración no puede convertirlos en avisos de un solo canal.
- Las respuestas frecuentes son textos reutilizables para la atención. No sustituyen los artículos revisados de EP-07 ni se envían automáticamente por el solo hecho de configurarlas.
- Los cambios deben indicar si afectan solo a nuevos casos o también a casos existentes. No se supone que editar una regla reescriba el historial, recalcule todos los SLA o redistribuya tickets por defecto.
- EP-10 protege las credenciales y registra las acciones sensibles. Los permisos de configuración y de consulta de resultados operativos se comprueban de manera independiente.

### 10.1. Mapa del recorrido

El recorrido parte de organizar el servicio, continúa con sus reglas de atención y comunicación y termina con la aplicación controlada de los cambios. La validación y la conservación de referencias acompañan todos los ajustes.

| Nivel del mapa | Organizar el servicio | Definir la atención | Configurar tiempos y distribución | Preparar la comunicación | Aplicar y mantener cambios |
| --- | --- | --- | --- | --- | --- |
| Tareas del usuario | Mantener clasificación, equipos y niveles | Definir estados y prioridades | Establecer enrutamiento, SLA, calendarios y escalamiento | Configurar eventos, textos e integración | Validar el efecto y retirar opciones sin perder historia |
| Entrega 1 propuesta: configuración básica controlada | HU-09-01 Mantener categorías; HU-09-03 Mantener equipos | HU-09-02 Configurar estados; HU-09-05 Configurar prioridades | HU-09-06 Configurar SLA y calendarios | HU-09-08 Mantener eventos y textos; HU-09-09 Configurar Telegram | HU-09-10 Aplicar cambios y desactivar opciones |
| Entrega 2 propuesta: reglas de distribución y escalamiento | — | — | HU-09-04 Configurar enrutamiento; HU-09-07 Configurar escalamiento | Ampliar eventos y plantillas según las funciones habilitadas | Aplicar los mismos controles a las nuevas reglas |

**Valor de la entrega 1:** el servicio dispone de catálogos, reglas de atención y comunicación que pueden ajustarse de forma controlada, con protección de los casos existentes.

**Valor de la entrega 2:** se incorporan las reglas básicas para dirigir solicitudes y activar las acciones de escalamiento acordadas.

Las entregas son una propuesta. Cada módulo necesita su configuración antes de utilizarla; si la primera versión incluye enrutamiento o escalamiento, debe incluir también sus historias de configuración. HU-09-10 se aplica desde el primer cambio y no se deja para una fase posterior. Los valores concretos deben acordarse con la empresa, no deducirse de esta propuesta.

### 10.2. Historias de usuario

#### HU-09-01 — Mantener categorías y opciones de clasificación

El responsable autorizado puede organizar las categorías, subcategorías y opciones que utilizan los solicitantes para describir sus solicitudes. Esto facilita que los casos se clasifiquen de manera consistente y lleguen al equipo adecuado.

**Para revisar con el equipo:**

- Se pueden crear y actualizar las opciones permitidas, con nombres comprensibles y relaciones válidas entre categorías y subcategorías.
- Se validan los datos obligatorios, las duplicidades según la regla acordada y las relaciones que no tengan sentido, como una categoría que dependa de sí misma.
- Las opciones habilitadas quedan disponibles para nuevos registros según su alcance. Desactivar una opción impide nuevos usos conforme a HU-09-10, sin eliminar la clasificación de los casos anteriores.
- Antes de retirar o modificar una opción usada por reglas de enrutamiento u otras funciones, se identifican sus dependencias y se exige resolver las incompatibilidades.
- Renombrar o reorganizar una categoría no cambia silenciosamente el significado histórico de los reportes. Su efecto se define antes de aplicar el cambio.

Propuesta para la entrega 1. Se relaciona con HU-01-01, HU-03-08 y las consultas de EP-08. Falta acordar el catálogo inicial, la profundidad de subcategorías y si los artículos de EP-07 utilizan este catálogo o uno separado, en coordinación con D-01 y D-47.

#### HU-09-02 — Configurar los estados y los cambios permitidos

El responsable del servicio puede definir qué estados utiliza el HelpDesk y qué pasos se permiten entre ellos. Así el flujo refleja la operación acordada sin dejar que cada persona cambie un caso a cualquier situación.

**Para revisar con el equipo:**

- Se identifican el estado inicial, los estados de conclusión y los cambios admitidos dentro de las capacidades soportadas por el sistema.
- Cada cambio conserva las condiciones y referencias de autorización necesarias. Configurar una transición no concede a un usuario el permiso para ejecutarla.
- Las reglas no permiten omitir condiciones obligatorias, como documentar una solución antes de resolver un caso, ni confundir resolución, cierre y cancelación.
- Se valida que los estados y destinos existan y que la configuración no deje casos activos sin una continuación válida según el flujo aprobado.
- Antes de modificar o desactivar un estado utilizado, se define qué ocurre con los tickets que ya están en él. No se cambia su estado de forma silenciosa ni se borra su historial.

Propuesta para la entrega 1. EP-02 ejecuta y valida las transiciones y EP-05 controla los permisos. Retoma D-10 y las decisiones de espera, cierre, cancelación y reapertura. No incluye un diseñador libre de procesos o condiciones arbitrarias.

#### HU-09-03 — Mantener la estructura de equipos y niveles

El administrador autorizado puede mantener los equipos y niveles de soporte para que las colas y destinos de atención reflejen la organización de la empresa. El equipo operativo puede utilizar esa estructura al distribuir las solicitudes.

**Para revisar con el equipo:**

- Se crean y actualizan equipos y niveles con identificadores estables y nombres que permitan distinguirlos.
- Las relaciones entre equipos y niveles cumplen la estructura acordada. No se habilitan combinaciones que la operación de asignación no pueda utilizar.
- La pertenencia de agentes y supervisores se administra en HU-05-06. Editar la estructura no agrega integrantes ni concede permisos por sí solo.
- Al desactivar un equipo o nivel se identifican agentes y supervisores asociados, tickets y reglas que lo utilizan. El tratamiento de esas dependencias debe resolverse antes de aplicar un cambio incompatible.
- Las referencias históricas se conservan en asignaciones y reportes. Renombrar un equipo no crea un responsable nuevo ni transfiere sus tickets automáticamente.

Propuesta para la entrega 1. Se relaciona con EP-03 y HU-05-06. Falta acordar las relaciones permitidas, los datos de cada equipo y el tratamiento de su desactivación, en coordinación con D-16, D-17 y D-20.

#### HU-09-04 — Configurar reglas básicas para dirigir solicitudes

El responsable autorizado puede indicar a qué equipo debe dirigirse una solicitud cuando cumple ciertos criterios admitidos, como una categoría. Esto permite aplicar una distribución consistente sin elegir manualmente el destino de cada caso.

**Para revisar con el equipo:**

- Cada regla identifica sus criterios, destino, momento de aplicación y condición de habilitación, dentro de las opciones soportadas.
- Los destinos deben existir y estar habilitados. Una regla no puede eludir los permisos o las combinaciones válidas de asignación.
- Si varias reglas pueden coincidir, se define una precedencia o se señala el conflicto antes de habilitarlas. No se deja que el orden accidental de procesamiento elija el destino.
- Se establece qué ocurre cuando ninguna regla coincide o el destino deja de estar disponible. Los casos deben seguir identificables para revisión autorizada.
- Un cambio de regla indica si aplica a nuevos casos o si se permite revisar casos existentes. No reemplaza una asignación manual posterior sin una política expresa.

Propuesta para la entrega 2, o antes si se utiliza enrutamiento desde el inicio. HU-03-08 aplica estas reglas y conserva su referencia. Retoma D-22; no incluye reparto mediante inteligencia artificial ni optimización avanzada de carga.

#### HU-09-05 — Configurar los criterios de prioridad

El responsable del servicio puede definir cómo se combinan el impacto y la urgencia para obtener una prioridad. El equipo dispone de criterios comunes para evaluar los casos y explicar por qué uno requiere atención antes que otro.

**Para revisar con el equipo:**

- Se mantienen los valores de impacto, urgencia y prioridad con descripciones que ayuden a utilizarlos de forma consistente.
- La matriz identifica la prioridad correspondiente a cada combinación admitida. Se señalan combinaciones sin definición o con resultados contradictorios antes de habilitar la configuración.
- Se configura el tratamiento permitido de las excepciones dentro de las capacidades del sistema; quién puede aplicarlas sigue dependiendo de EP-05.
- Los cambios conservan la referencia a la configuración anterior. No se recalculan prioridades de tickets existentes ni se eliminan incumplimientos por editar la matriz.
- Si una prioridad participa en políticas de SLA o escalamiento, se comprueba que el cambio mantenga válidas esas relaciones.

Propuesta para la entrega 1. HU-04-01 y HU-04-02 aplican los criterios y los ajustes. Falta acordar los valores, combinaciones y tratamiento de excepciones, en coordinación con D-23 y D-28.

#### HU-09-06 — Configurar los SLA, horarios y reglas de conteo

El responsable autorizado puede establecer los compromisos de primera respuesta y resolución junto con los horarios en que cuentan sus tiempos. Esto permite que el seguimiento de cada caso utilice una política explícita y comprensible.

**Para revisar con el equipo:**

- Cada política identifica cuándo aplica y sus objetivos separados de primera respuesta y resolución, con unidades y eventos de inicio definidos.
- Se mantienen zona horaria, horarios laborales y días no laborables. Los valores y calendarios se validan para evitar rangos imposibles o condiciones incompatibles.
- Las políticas definen las pausas y reanudaciones permitidas y el tratamiento de cambios de prioridad, cancelaciones y reaperturas dentro de lo soportado por el sistema.
- Si varias políticas pueden aplicar al mismo caso, se establece una selección inequívoca o se informa el conflicto antes de habilitarlas.
- La modificación conserva la política y el calendario anteriores para explicar cálculos históricos. Se declara el efecto sobre casos en curso antes de aplicar un recálculo autorizado.
- Cambiar un objetivo o calendario no elimina un incumplimiento previo ni presenta como cumplido un compromiso que no puede evaluarse.

Propuesta para la entrega 1. EP-04 selecciona la política y calcula los tiempos; EP-08 utiliza sus resultados. Retoma D-24 a D-28. No se fijan valores de tiempo ni reglas de pausa por defecto en esta historia.

#### HU-09-07 — Configurar riesgos y reglas de escalamiento

El responsable del servicio puede indicar cuándo un compromiso necesita atención especial y qué intervención corresponde. Así los riesgos e incumplimientos tienen una respuesta acordada en lugar de depender de una decisión improvisada en cada caso.

**Para revisar con el equipo:**

- Cada regla identifica el compromiso afectado, la condición de riesgo o incumplimiento y la acción admitida, como avisar a un supervisor o solicitar una transferencia de nivel.
- Los umbrales, destinatarios y destinos deben ser válidos y compatibles con las políticas de SLA y la estructura de soporte.
- Se definen la precedencia, las condiciones de repetición y los límites que correspondan para evitar ciclos de escalamiento o avisos repetidos sin justificación.
- Se establece qué ocurre si el destino no está disponible o si el caso deja de cumplir la condición antes de ejecutar una acción pendiente.
- Modificar una regla no borra escalamientos anteriores ni ejecuta transferencias directamente desde la configuración.

Propuesta para la entrega 2, o desde que la política exija escalamientos. HU-04-07 y HU-04-08 detectan y activan las condiciones; EP-03 realiza transferencias y EP-06 entrega avisos. Retoma D-29 y D-30 y su coordinación con D-21.

#### HU-09-08 — Mantener eventos, plantillas y respuestas frecuentes

El responsable autorizado puede definir qué eventos requieren avisos, quién debe recibirlos y cómo se redactan. También puede mantener textos frecuentes para que soporte los reutilice con un lenguaje consistente durante la atención.

**Para revisar con el equipo:**

- El catálogo utiliza eventos que los módulos pueden producir e identifica cuáles son importantes o relevantes. Para estos se requieren avisos en la aplicación y Telegram; no se puede guardar una configuración que deje habilitado solo un canal.
- Los destinatarios se definen por relaciones o responsabilidades admitidas y siempre quedan sujetos a los permisos vigentes al enviar. La configuración no autoriza a revelar contenido de cualquier ticket.
- Las plantillas por canal utilizan únicamente datos y campos disponibles y permitidos. Una referencia inválida o contenido restringido para la audiencia debe corregirse antes de habilitarlas.
- Se puede revisar una vista previa con datos de ejemplo para comprobar el texto sin enviar avisos reales ni exponer información de tickets.
- Las respuestas frecuentes se identifican como textos reutilizables, distintos de una notificación automática y de un artículo publicado. Su mantenimiento no envía mensajes ni acredita una respuesta de atención.
- Se conservan los cambios de textos y reglas para explicar qué configuración se utilizó. Se acuerda su efecto sobre los avisos que ya estaban pendientes, sin reescribir el contenido de envíos completados.

Propuesta para la entrega 1. EP-06 selecciona destinatarios y realiza los envíos; la utilización de respuestas frecuentes debe ajustarse al mecanismo de conversación que se valide. Retoma D-08 y D-40. Falta concretar el catálogo, los campos por plantilla y cómo se pondrán los textos frecuentes a disposición de los agentes.

#### HU-09-09 — Configurar y supervisar la integración con Telegram

El personal autorizado puede mantener los parámetros necesarios para operar la integración y revisar si presenta problemas de comunicación. Esto permite atender fallos sin exponer credenciales a quienes solo necesitan consultar el estado del servicio.

**Para revisar con el equipo:**

- Solo los permisos específicos permiten cambiar parámetros sensibles o credenciales. Consultar incidencias de envío no habilita por sí solo su lectura o modificación.
- Las credenciales se protegen y no aparecen completas en pantallas de consulta, registros de auditoría, mensajes de error o exportaciones.
- Los parámetros de intentos, intervalos y recuperación se validan dentro de los límites que soporte la integración. Se identifican configuraciones incompletas antes de presentarlas como operativas.
- La revisión del estado distingue una configuración guardada de una conexión comprobada y de la entrega de mensajes concretos. Una comprobación satisfactoria no garantiza que todos los envíos pendientes se hayan completado.
- Se dispone de acceso autorizado al seguimiento de fallos de HU-06-09 y al procedimiento de recuperación de HU-06-10, sin duplicar sus registros ni conceder acceso indiscriminado a conversaciones.
- Un cambio de credenciales o parámetros conserva la trazabilidad y define qué ocurre con los envíos pendientes. Si Telegram queda indisponible, los avisos de la aplicación permanecen disponibles y los envíos pendientes no se marcan como completados.

Propuesta para la entrega 1 en cuanto se utilice Telegram. EP-06 opera la integración y EP-10 protege secretos y registros. La vinculación de cada usuario sigue en EP-05. Retoma D-45 y D-46; falta definir los parámetros admitidos y el procedimiento de comprobación y sustitución de credenciales.

#### HU-09-10 — Aplicar cambios y desactivar opciones sin perder antecedentes

El responsable autorizado puede revisar el efecto de un ajuste antes de aplicarlo y retirar opciones que ya no deben utilizarse. El sistema conserva los antecedentes para que el equipo entienda con qué reglas se atendieron los casos anteriores.

**Para revisar con el equipo:**

- Antes de aplicar un cambio se validan los datos, los permisos y las dependencias relevantes, indicando qué impide guardarlo o qué efecto necesita definirse.
- Se identifica si el ajuste afecta a nuevos usos, a casos existentes o a operaciones pendientes. No se aplica una migración, reasignación o recálculo sin una regla explícita y la autorización correspondiente.
- La desactivación impide nuevos usos según la política acordada, pero conserva las referencias históricas. No se eliminan opciones que los registros existentes necesitan para mantener su significado.
- Cada cambio conserva quién lo realizó, cuándo, su motivo y los valores o versiones anteriores y posteriores que permitan reconstruirlo. Los secretos se excluyen de esos registros.
- Si otra persona modificó la configuración durante la edición, se informa antes de reemplazar sus cambios. Si la operación falla, se mantiene una configuración coherente y no se presenta como aplicada.
- Los ajustes relacionados que necesitan activarse juntos no dejan temporalmente reglas incompatibles en uso. El mecanismo concreto de aplicación debe acordarse según las capacidades del sistema.
- Consultar una configuración anterior permite entender la historia; no implica que pueda restaurarse automáticamente sobre casos actuales sin validar nuevamente su efecto.

Propuesta para la entrega 1 y condición común a todas las historias de EP-09. Cada módulo aplica sus reglas y EP-10 audita las operaciones. Falta acordar la vigencia de los cambios, los permisos para modificar casos existentes y si se necesitan aprobación adicional o programación de cambios; no se dan por obligatorias sin definirlas.

### 10.3. Cómo se cubre la épica

| Capacidad de EP-09 | Historias que la cubren | Relación con otras épicas |
| --- | --- | --- |
| Categorías, subcategorías y clasificación | HU-09-01 | Registro de EP-01, distribución de EP-03 y análisis de EP-08 |
| Estados y transiciones permitidas | HU-09-02 | Ejecución del ciclo de vida en EP-02 |
| Equipos, niveles y reglas básicas de enrutamiento | HU-09-03, HU-09-04 | Asignación de EP-03 y pertenencia de agentes y supervisores de EP-05 |
| Prioridades y criterios de evaluación | HU-09-05 | Aplicación de HU-04-01 y HU-04-02 |
| SLA, horarios y días no laborables | HU-09-06 | Cálculos de EP-04 e indicadores de EP-08 |
| Reglas de riesgo y escalamiento | HU-09-07 | Detección de EP-04 y transferencias de EP-03 |
| Plantillas, respuestas frecuentes, catálogo de eventos y destinatarios | HU-09-08 | Comunicación y avisos por ambos canales en EP-06 |
| Parámetros de Telegram y supervisión protegida de fallos y reintentos | HU-09-09 | Operación de EP-06 y protección de EP-10 |
| Validación, desactivación y conservación de referencias | HU-09-10 | Todas las funciones que utilizan configuración e historial de EP-10 |

### 10.4. Lo que falta acordar con el equipo

Las reglas de negocio pendientes en las épicas anteriores se resuelven una sola vez y se reflejan aquí como configuración. Esta sección añade decisiones sobre cómo administrar y aplicar esos ajustes.

| ID | Decisión necesaria | Historias afectadas |
| --- | --- | --- |
| D-63 | Definir permisos de configuración por área y distinguir administración de catálogos, políticas, credenciales y consulta operativa. Coordinar con D-35. | Todas las historias pertinentes |
| D-64 | Acordar vigencia, alcance sobre casos existentes y pendientes, conservación de versiones y aplicación conjunta de cambios relacionados. | HU-09-10 y los catálogos o políticas afectados |
| D-65 | Definir profundidad de subcategorías, reglas de nombres y tratamiento de clasificación histórica al reorganizar opciones. Coordinar con D-01, D-47 y D-55. | HU-09-01 |
| D-66 | Precisar qué condiciones y relaciones pueden configurarse para estados, equipos y reglas, dentro de las capacidades reales del sistema. Retomar D-10, D-16, D-17 y D-22. | HU-09-02, HU-09-03, HU-09-04 |
| D-67 | Acordar campos permitidos en plantillas, vista previa, uso de respuestas frecuentes y efecto de cambios de texto sobre envíos pendientes. Complementa D-08 y D-40. | HU-09-08 |
| D-68 | Definir parámetros operativos de Telegram, comprobación de funcionamiento, sustitución de credenciales y manejo de pendientes durante los cambios. Complementa D-45 y D-46. | HU-09-09 |
| D-23 a D-30, seguimiento | Llevar a configuración los criterios de prioridad, políticas y calendarios de SLA, pausas, umbrales y escalamientos acordados, sin cambiar su significado. | HU-09-05, HU-09-06, HU-09-07 |
| D-20, D-39 y D-09, seguimiento | Resolver dependencias ante desactivación, tratamiento de envíos pendientes y conservación de referencias históricas y registros de configuración. | HU-09-03, HU-09-08, HU-09-09, HU-09-10 |

## 11. EP-10 — Seguridad, auditoría y recuperación de la información

### Objetivo y participantes

Que la información del HelpDesk permanezca protegida, que las acciones sensibles puedan revisarse y que el servicio pueda recuperarse ante un fallo. La protección debe comprobarse tanto durante el uso habitual como al restaurar datos y reanudar la comunicación.

Participan los responsables internos de operación tecnológica, administradores con permisos específicos y personal autorizado para auditoría. Los usuarios se benefician de estos controles sin tener que conocer sus detalles técnicos para registrar o atender una solicitud.

### Alcance y relación con otras épicas

- Esta épica acompaña al resto desde el inicio. Su posición al final del documento no significa que la seguridad, los respaldos o las pruebas de recuperación puedan dejarse para después de poner el sistema en uso.
- EP-05 define identidades y permisos. EP-10 protege la autenticación, las sesiones y la aplicación de esas autorizaciones en cada operación.
- El historial de EP-02 explica la atención del ticket. La auditoría permite revisar accesos, cambios de permisos, configuración y otras acciones sensibles; ninguno sustituye al otro.
- EP-06 gestiona la conversación, los avisos y sus resultados. EP-10 protege el origen de los intercambios, los secretos de integración y los contenidos, y verifica que la recuperación no reenvíe información sin autorización.
- EP-09 permite administrar parámetros y credenciales dentro de su alcance. El permiso para configurar una función no concede acceso irrestricto a sus secretos, datos o registros de auditoría.
- La protección se aplica también a archivos, búsquedas, reportes, exportaciones y copias de respaldo, según la sensibilidad de la información.
- Los respaldos deben incluir lo necesario para recuperar el servicio de forma coherente. Su existencia no demuestra por sí sola que la restauración funcione.
- La frecuencia de respaldo, la retención, la pérdida máxima de datos aceptable y el tiempo objetivo de recuperación deben acordarse con la empresa. No se fijan tecnologías, plazos ni garantías absolutas en estas historias.

### 11.1. Mapa del recorrido

El recorrido reúne la prevención durante el uso cotidiano, la revisión de acciones sensibles y la preparación para recuperar el servicio.

| Nivel del mapa | Proteger el acceso | Proteger datos e intercambios | Conservar evidencia | Preparar la recuperación | Recuperar y comprobar |
| --- | --- | --- | --- | --- | --- |
| Tareas del usuario | Validar identidad, sesión y permisos | Proteger secretos, validar contenido y controlar Telegram | Registrar y consultar acciones sin alteraciones indebidas | Respaldar datos y archivos de forma protegida | Restaurar, revisar resultados y reanudar comunicaciones |
| Base necesaria desde el primer uso | HU-10-01 Proteger el acceso | HU-10-02 Proteger información y secretos; HU-10-03 Validar entradas y archivos | HU-10-06 Registrar acciones; HU-10-07 Proteger la auditoría | HU-10-08 Ejecutar respaldos | HU-10-09 Probar la restauración |
| Controles que acompañan la habilitación de Telegram | Aplicar los permisos también a la integración | HU-10-04 Validar comunicaciones de origen; HU-10-05 Limitar contenido enviado | Auditar vinculaciones, cambios y fallos | Incluir el estado de envíos | HU-10-10 Reanudar la integración de forma controlada |

**Valor de la base inicial:** el servicio puede utilizarse con controles verificables sobre el acceso y los datos, evidencia de acciones sensibles y una recuperación probada.

**Valor de los controles de integración:** la comunicación por Telegram conserva los mismos límites de autorización y puede reanudarse después de un fallo sin perder su relación con los casos.

Las filas indican cuándo se necesitan los controles, no dos etapas que permitan operar temporalmente sin protección. Las historias se desarrollan junto con las funciones que protegen. Antes de utilizar datos reales debe comprobarse la recuperación prevista para esa versión, y antes de habilitar Telegram debe comprobarse también el tratamiento de sus envíos pendientes.

### 11.2. Historias de usuario

#### HU-10-01 — Proteger el acceso y las sesiones del HelpDesk

El usuario puede utilizar su cuenta con la confianza de que otra persona no podrá continuar su sesión o realizar acciones fuera de los permisos que tiene. El equipo responsable puede comprobar que esas restricciones funcionan también cuando se intenta acceder directamente a una operación o archivo.

**Para revisar con el equipo:**

- Las funciones protegidas comprueban la identidad, la vigencia de la cuenta y los permisos necesarios para la acción y el dato solicitado. La validación no depende solo de lo que muestra la pantalla.
- Cerrar sesión, vencer su vigencia o desactivar la cuenta impide nuevas operaciones con esa sesión según las reglas de EP-05. Un enlace guardado no recupera una autorización retirada.
- Las operaciones que modifican información verifican que la solicitud corresponda a una sesión válida y no sea una acción inducida sin autorización del usuario.
- Los intentos de autenticación abusivos o repetidos se tratan con los controles acordados, sin exponer credenciales ni revelar innecesariamente la existencia de otras cuentas.
- La recuperación de acceso exige la verificación definida en HU-05-04 y no permite omitir la desactivación o elevar privilegios.
- Se comprueba el rechazo de consultas y acciones no autorizadas en tickets, archivos, artículos, reportes, configuración e integración, incluyendo accesos directos.

Necesaria desde el primer acceso protegido. Implementa los controles que respaldan HU-05-03, HU-05-04 y HU-05-07. Falta acordar los parámetros de sesiones y protección de autenticación en coordinación con D-34; las cuentas y los roles siguen administrándose en EP-05.

#### HU-10-02 — Proteger la información y las credenciales

El responsable tecnológico puede mantener protegidos los datos del servicio y las credenciales que permiten operarlo. Las personas consultan solo la información necesaria para su función, sin que las pantallas o los registros revelen secretos de acceso.

**Para revisar con el equipo:**

- Las comunicaciones de la aplicación y de sus integraciones utilizan mecanismos de protección acordes con la sensibilidad de los datos. Las credenciales no se transmiten mediante enlaces o mensajes sin protección.
- Los datos almacenados, archivos y copias de respaldo tienen controles de acceso y protección definidos según su clasificación. Se comprueba que no queden expuestos como recursos públicos por su ubicación o configuración.
- Los secretos de integración solo pueden administrarse con permisos específicos y no aparecen completos en pantallas de consulta, errores, auditorías o exportaciones.
- Si el HelpDesk administra contraseñas, no las conserva en texto legible ni permite recuperarlas mediante una consulta administrativa. Si utiliza identidad corporativa, respeta el mecanismo acordado con ese proveedor.
- Se define cómo sustituir o revocar credenciales y cómo recuperar de forma autorizada el material necesario para restaurar datos protegidos, sin colocarlo en registros de auditoría.
- Los errores informan lo necesario para resolver el problema sin exponer credenciales, contenido privado u otros detalles sensibles.

Necesaria desde que se almacene o transmita información real. Se relaciona con HU-09-09, los archivos de las otras épicas y las exportaciones de HU-08-10. Falta acordar la clasificación de datos, la protección por categoría y la gestión del material de acceso y recuperación.

#### HU-10-03 — Validar los datos y archivos antes de procesarlos

El solicitante puede registrar información y aportar archivos sin que una entrada inválida comprometa el servicio o exponga datos de otras personas. El sistema rechaza lo que no cumple las reglas y permite entender qué debe corregirse.

**Para revisar con el equipo:**

- Los datos se validan al recibirlos, aunque se envíen por fuera del formulario habitual. Se comprueban formato, longitud, valores permitidos y reglas aplicables a cada operación.
- El contenido ingresado se trata como datos y no como instrucciones ejecutables. Su presentación y uso en consultas, artículos, mensajes o exportaciones mantiene los controles apropiados para cada destino.
- Los archivos se comprueban por sus características y contenido según la política acordada, sin confiar solo en el nombre o extensión que aporta el usuario.
- Un archivo rechazado o pendiente de validación no queda disponible para descarga o reenvío como si ya hubiera sido aceptado. La carga no permite reemplazar archivos ajenos o escribir fuera del espacio autorizado.
- Abrir o descargar un archivo vuelve a comprobar los permisos sobre su contenido, incluidos los adjuntos de tickets, conversaciones y notas internas.
- Si la validación no puede completarse, se informa esa situación y no se presenta el contenido como seguro o aceptado sin evidencia.

Necesaria desde que se reciban entradas o archivos. Aplica a HU-01-02, HU-06-04, HU-06-06, EP-07 y HU-08-10. Falta definir límites y tratamiento de contenido rechazado, coordinados con D-02, D-42 y las necesidades de cada módulo.

#### HU-10-04 — Comprobar el origen y la autorización de los intercambios de Telegram

El equipo puede confiar en que los mensajes que la integración recibe y dirige provienen del mecanismo autorizado y de usuarios habilitados para el caso. Esto evita aceptar mensajes ajenos o asociarlos a una solicitud por una identidad no verificada.

**Para revisar con el equipo:**

- La recepción valida el origen mediante el mecanismo que se acuerde y pruebe para la integración. Un nombre visible o un identificador aportado sin verificación no bastan para acreditar al emisor.
- Antes de reenviar contenido, se comprueban la cuenta habilitada, la vinculación vigente y el permiso del usuario sobre ese ticket.
- Una asociación ambigua sigue el procedimiento de HU-06-01 y no dirige contenido al caso por suposición.
- Los intercambios rechazados no se reenvían ni aparecen como atención válida. La incidencia conserva la evidencia mínima necesaria para revisión sin copiar secretos o contenido sensible innecesario.
- Reprocesar un intercambio válido no permite repetir acciones ni enviar contenido adicional; se utiliza la referencia de origen y el control de duplicados de EP-06.
- Una identidad revocada no vuelve a quedar habilitada por un mensaje pendiente o por haber participado anteriormente en el caso.

Necesaria antes de habilitar Telegram. Complementa HU-05-09, HU-05-10 y HU-06-01. Falta validar técnicamente la comprobación de origen y el tratamiento de comunicaciones rechazadas, en coordinación con D-38 y D-40.

#### HU-10-05 — Evitar que se envíe información no autorizada a Telegram

El solicitante y el equipo pueden comunicarse sin que la integración publique notas internas, archivos restringidos o información que el destinatario no necesita conocer. La comprobación se aplica también cuando un mensaje se preparó antes de un cambio de permisos.

**Para revisar con el equipo:**

- Antes de cada envío o reintento se comprueban el destinatario, su vinculación y sus permisos vigentes, no solo los que tenía al preparar el mensaje.
- El contenido y las plantillas se limitan a los datos necesarios y autorizados para el evento o conversación. Las notas internas y sus adjuntos permanecen dentro del HelpDesk.
- Los enlaces a archivos o tickets no evitan la autorización. Los archivos enviados directamente deben haber pasado la validación y estar permitidos para el destinatario.
- Una reasignación, desvinculación o desactivación impide nuevos envíos a quien perdió acceso, conforme a las reglas de EP-05 y EP-06.
- Si no puede comprobarse el permiso, el envío no se completa por suposición. Se identifica la incidencia sin divulgar el contenido a un destinatario alternativo.
- Se comprueba que avisos, vistas previas y errores no revelen información restringida. Revocar el acceso no se presenta como garantía de borrar copias que un destinatario ya recibió fuera del HelpDesk.

Necesaria junto con los primeros envíos de Telegram. Refuerza HU-03-10, HU-06-07 y HU-06-08. Falta acordar los datos permitidos por tipo de mensaje y la evidencia que se conservará de las verificaciones.

#### HU-10-06 — Registrar las acciones sensibles para poder revisarlas

El personal autorizado para auditoría puede conocer quién realizó una acción relevante, cuándo ocurrió y cuál fue su resultado. Esto permite investigar cambios de acceso o configuración y revisar incidentes con evidencia, sin depender únicamente del historial de un ticket.

**Para revisar con el equipo:**

- El catálogo de auditoría incluye los accesos y acciones acordados, los cambios de permisos, configuración, vinculaciones y desvinculaciones, así como operaciones sensibles y fallos de envío relevantes.
- Cada registro identifica al usuario o proceso, la fecha, la acción, el recurso afectado y el resultado. Cuando corresponda, conserva el motivo y los cambios necesarios para entender la operación.
- Las fechas y referencias permiten relacionar acciones entre módulos y distinguir el momento del evento del procesamiento posterior cuando sean diferentes.
- Los registros no almacenan contraseñas, credenciales de integración, códigos de verificación ni copias completas de contenido privado sin necesidad justificada.
- Si falla el registro de auditoría, se detecta la incidencia y se aplica el tratamiento acordado para la operación afectada. No se afirma que una acción quedó auditada cuando falta su evidencia.
- La auditoría distingue acciones intentadas, rechazadas y completadas cuando corresponda, sin atribuir éxito a una operación fallida.

Necesaria desde las primeras operaciones sensibles. Complementa el historial de HU-02-09 y los cambios de EP-05 y EP-09. Falta acordar el catálogo, la precisión temporal y qué operaciones deben detenerse si no pueden conservar su evidencia.

#### HU-10-07 — Consultar y proteger los registros de auditoría

La persona autorizada para auditoría puede revisar los registros que necesita para investigar una acción. El acceso y la conservación están controlados para que una persona no pueda ocultar sus cambios editando o eliminando esa evidencia sin autorización.

**Para revisar con el equipo:**

- La consulta requiere permisos específicos y limita el alcance de información visible. Ser administrador operativo no concede automáticamente acceso completo a la auditoría.
- Se propone buscar por período, actor, acción o recurso, respetando los mismos límites en los resultados y en cualquier exportación que se habilite.
- Las funciones habituales del HelpDesk no permiten sobrescribir o borrar registros de auditoría. Su protección impide modificaciones no autorizadas y permite detectar las alteraciones contempladas por el mecanismo acordado.
- Una aclaración o corrección autorizada conserva el registro original y su trazabilidad; no lo sustituye silenciosamente.
- La retención y eliminación autorizada siguen un procedimiento definido. Tener permiso de consulta no concede permiso para modificar o depurar registros.
- El acceso y las acciones sensibles sobre la propia auditoría dejan evidencia protegida. La recuperación de un respaldo no debe utilizarse para ocultar cambios o incidentes posteriores.

Necesaria desde que exista auditoría. Se relaciona con HU-10-06 y HU-10-09. Falta acordar roles de revisión, protección de integridad, retención y procedimiento de eliminación, sin prometer una inmutabilidad que no haya sido implementada y comprobada.

#### HU-10-08 — Ejecutar respaldos protegidos y comprobar su resultado

El responsable de operación puede contar con copias de los datos y archivos necesarios para recuperar el HelpDesk. Puede revisar qué se respaldó, de qué momento es la copia y si el proceso terminó correctamente.

**Para revisar con el equipo:**

- El respaldo incluye los datos, archivos y configuración necesarios para recuperar una versión coherente del servicio. Se contemplan tickets, identidades y permisos, historial, auditoría, conocimiento y encuestas según las funciones habilitadas.
- Cuando exista Telegram, también se incluye el estado de procesamiento y envíos pendientes. Los mensajes de la conversación no se respaldan porque el HelpDesk no los conserva.
- Se identifican las dependencias externas y el material protegido necesario para restaurar, sin asumir que una copia de datos recupera cuentas, mensajes o servicios externos de Telegram.
- Las copias tienen acceso y retención controlados y la protección acordada frente a exposición, pérdida o alteración. No se depende únicamente de una copia vulnerable al mismo fallo que el servicio principal.
- Cada ejecución conserva fecha, alcance y resultado. Una copia incompleta o fallida no se presenta como respaldo válido; la incidencia queda disponible para su atención.
- Se comprueba la integridad de la copia con el mecanismo acordado, distinguiendo esa comprobación de una prueba completa de restauración.

Necesaria antes de operar con datos reales, con ampliaciones cuando se incorporen nuevas funciones. Se relaciona con HU-10-09 y HU-10-10. Falta acordar frecuencia, ubicación, retención, responsables y pérdida máxima de datos aceptable.

#### HU-10-09 — Probar la restauración del servicio y registrar sus resultados

El responsable tecnológico puede seguir un procedimiento de recuperación y demostrar que el HelpDesk vuelve a funcionar con datos coherentes. La prueba permite conocer el tiempo necesario, las limitaciones y los problemas que deben corregirse antes de depender de una recuperación real.

**Para revisar con el equipo:**

- Existe un procedimiento que identifica responsables, copias necesarias, dependencias, pasos de restauración y comprobaciones antes de devolver el servicio a los usuarios.
- Las pruebas se realizan en un entorno controlado, con acceso protegido y sin sobrescribir la operación vigente ni enviar mensajes reales por accidente.
- Se verifican relaciones entre tickets, archivos, identidades, permisos, historial y las demás funciones habilitadas. Recuperar solo la base de datos no se presenta como suficiente si faltan archivos o configuración necesaria.
- Se mide el tiempo de recuperación y se identifica hasta qué momento se recuperaron datos para compararlos con los objetivos acordados. Cualquier pérdida o inconsistencia se registra explícitamente.
- Antes de habilitar el acceso se revisan sesiones, permisos, cuentas desactivadas y credenciales: una copia anterior no debe reactivar silenciosamente autorizaciones que ya se habían revocado. Si falta evidencia vigente, se resuelve antes de habilitar el acceso afectado.
- La prueba conserva fecha, copia utilizada, verificaciones, resultados y acciones pendientes. Solo una restauración comprobada permite afirmar que ese procedimiento funcionó bajo las condiciones ensayadas.
- La recuperación real sigue el procedimiento y la autorización definidos para el incidente; contar con un respaldo no autoriza por sí solo reemplazar datos actuales.

Necesaria antes del primer uso y repetida según el programa acordado y los cambios relevantes del sistema. Falta definir el tiempo objetivo de recuperación, la pérdida aceptable, la frecuencia de pruebas y quién autoriza volver a operar.

#### HU-10-10 — Reanudar Telegram después de una recuperación

El responsable autorizado puede reanudar la integración después de restaurar el HelpDesk, revisando qué envíos faltan. Esto evita repetir mensajes ya enviados o dirigir pendientes a personas que dejaron de tener acceso.

**Para revisar con el equipo:**

- Antes de reanudar, se revisan los envíos recuperados, sus referencias de origen y sus estados de envío. Se identifican posibles diferencias entre la copia restaurada y lo ocurrido después.
- No se reenvían todos los envíos por el solo hecho de restaurar. Se distinguen los completados, pendientes, fallidos y aquellos cuyo resultado no se puede confirmar.
- Se comparan las evidencias disponibles para resolver resultados inciertos. Cuando el canal no permite comprobar lo ocurrido, se mantiene visible la incertidumbre y se sigue el procedimiento autorizado antes de repetir contenido.
- Se vuelven a comprobar cuentas, vinculaciones, responsables y permisos vigentes antes de aceptar o enviar nuevos contenidos. Las referencias de una copia antigua no rehabilitan destinatarios revocados.
- Los reintentos utilizan los controles de HU-06-10 para evitar duplicados en mensajes y notificaciones. Las respuestas reprocesadas no se cuentan como nuevas primeras respuestas de SLA.
- Las notificaciones conservadas en la aplicación siguen disponibles según los permisos. Un envío que todavía no puede recuperarse por Telegram no se marca como completado en ese canal.
- La prueba de recuperación incluye la reanudación controlada de la integración y registra los casos que requieren intervención, sin enviar mensajes reales desde un entorno de prueba por defecto.

Necesaria antes de habilitar Telegram y en las pruebas de recuperación que lo incluyan. Se coordina con EP-05, HU-06-09, HU-06-10 y HU-10-09. Falta acordar la comprobación posterior a una restauración y el tratamiento de eventos que quedaron fuera de la copia recuperada.

### 11.3. Cómo se cubre la épica

| Capacidad de EP-10 | Historias que la cubren | Relación con otras épicas |
| --- | --- | --- |
| Autenticación, sesiones y autorización | HU-10-01 | Identidades y accesos de EP-05; operaciones de todos los módulos |
| Protección de credenciales, comunicaciones, datos y archivos | HU-10-02 | Integración de EP-06, configuración de EP-09 y datos del servicio |
| Validación de entradas y archivos | HU-10-03 | Registro de EP-01, archivos de EP-06, artículos de EP-07 y exportaciones de EP-08 |
| Origen y autorización de intercambios de Telegram | HU-10-04 | Vinculaciones de EP-05 y recepción de EP-06 |
| Contenido necesario y autorizado hacia Telegram | HU-10-05 | Destinatarios, notas internas y envíos de EP-06 |
| Auditoría de accesos, permisos, vinculaciones, configuración y fallos | HU-10-06 | Acciones sensibles de EP-05, EP-06 y EP-09 |
| Acceso e integridad de registros de auditoría | HU-10-07 | Distinción respecto al historial operativo de EP-02 |
| Respaldos con acceso y retención controlados | HU-10-08 | Datos y archivos de todas las funciones habilitadas |
| Procedimientos y pruebas de restauración | HU-10-09 | Continuidad del servicio y revisión de accesos de EP-05 |
| Recuperación de pendientes sin duplicados evitables | HU-10-10 | Identidades de EP-05 y recuperación de EP-06 |

### 11.4. Lo que falta acordar con el equipo

Los controles se convertirán en comprobaciones concretas al definir la arquitectura y las políticas de la empresa. Esta sección no fija productos técnicos ni valores de servicio sin aprobación.

| ID | Decisión necesaria | Historias afectadas |
| --- | --- | --- |
| D-69 | Acordar controles técnicos y comprobaciones de autenticación, sesiones y autorización, incluyendo intentos abusivos y revocación. Coordinar con D-34 y D-35. | HU-10-01 |
| D-70 | Definir clasificación de información, protección en tránsito y almacenamiento y administración, sustitución y recuperación de secretos. Coordinar con D-63 y D-68. | HU-10-02 |
| D-71 | Acordar validación de contenido y archivos, tratamiento de entradas rechazadas y fallos de validación. Complementa D-02 y D-42. | HU-10-03 |
| D-72 | Validar el mecanismo de comprobación de origen de Telegram, los datos permitidos por mensaje y el tratamiento de intercambios no autorizados. Coordinar con D-38, D-39 y D-40. | HU-10-04, HU-10-05 |
| D-73 | Definir catálogo y campos de auditoría, referencias temporales y tratamiento de operaciones cuando falle el registro de evidencia. | HU-10-06 |
| D-74 | Acordar permisos, controles de integridad, retención y eliminación autorizada de auditoría, incluyendo su protección durante una recuperación. | HU-10-07 |
| D-75 | Definir alcance, frecuencia, ubicación, protección y retención de respaldos, así como responsables de atender fallos. | HU-10-08 |
| D-76 | Acordar pérdida máxima de datos aceptable, tiempo objetivo de recuperación, frecuencia de pruebas y autorización para restaurar y volver a operar. | HU-10-09 |
| D-77 | Definir cómo se recupera evidencia vigente de permisos y revocaciones, se revisan eventos posteriores a la copia y se resuelven envíos inciertos antes de reanudar Telegram. Coordinar con D-39 y D-46. | HU-10-09, HU-10-10 |
| D-09, seguimiento | Consolidar la retención y los objetivos de calidad de todas las épicas con las políticas de protección y recuperación, evitando reglas incompatibles. | Todas las historias pertinentes |