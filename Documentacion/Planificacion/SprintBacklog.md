# HelpDesk: Sprint Backlog (MVP)

Fuente: `Requerimientos/UserStoryMapping.md` y `Requerimientos/Epics.md`. El MVP son 20 de las 98 historias. Sprints de 2 semanas; las fechas reales se fijan cuando el equipo confirme su disponibilidad.

**Estado de cada ítem:** Por hacer / En curso / Hecho. Responsable: por asignar.

## Sprint 0: Cimientos (Semanas 1 y 2)

**Objetivo:** dejar listo el entorno y las decisiones para empezar a construir. Sin historias de usuario.

| # | Tarea | Responsable | Estado |
|---|---|---|---|
| S0-01 | Definir stack tecnológico y forma de despliegue (se propone web) | | Por hacer |
| S0-02 | Crear estructura del repositorio, ramas y flujo de trabajo del equipo (revisión de cambios) | | Por hacer |
| S0-03 | Preparar entorno de desarrollo local reproducible para todo el equipo | | Por hacer |
| S0-04 | Provisionar base de datos y esquema inicial de usuarios, roles y tickets | | Por hacer |
| S0-05 | Preparar hosting de pruebas y pipeline de integración continua | | Por hacer |
| S0-06 | Crear el bot de Telegram de pruebas y confirmar que permite la conversación en ambos sentidos | | Por hacer |
| S0-07 | Diseñar prototipo de pantallas de los flujos del MVP | | Por hacer |
| S0-08 | Cerrar con el cliente las decisiones pendientes (ver abajo) | | Por hacer |
| S0-09 | Mover el repositorio fuera de iCloud Drive y limpiar los residuos de documentación | | Por hacer |

**Decisiones pendientes del cliente (bloquean sprints posteriores):**

- Qué cuenta como primera respuesta de un agente (afecta HU-04-04 y los tiempos).
- Quién puede cerrar o cancelar tickets (Sprint 3).
- Quién ajusta prioridades y concede excepciones de tiempo (Sprint 4).
- Plataforma: web, móvil o escritorio.
- Quién revisa y publica artículos, y quién audita y respalda (no bloquea el MVP).

## Sprint 1: Cuentas y acceso (Semanas 3 y 4)

**Objetivo:** Que cada persona entre al sistema con su rol.

| ID | Épica | Historia | Rol | Estado |
|---|---|---|---|---|
| HU-05-01 | EP-05 | Habilitar una cuenta para un usuario | Administrador | Por hacer |
| HU-05-03 | EP-05 | Entrar al HelpDesk y cerrar la sesión | Todos | Por hacer |
| HU-05-05 | EP-05 | Asignar y ajustar roles | Administrador | Por hacer |
| HU-05-07 | EP-05 | Acceder únicamente a las funciones y datos autorizados | Todos | Por hacer |
| HU-10-01 | EP-10 | Proteger el acceso y las sesiones | Administrador | Por hacer |
| HU-09-01 | EP-09 | Mantener categorías de clasificación | Administrador | Por hacer |

## Sprint 2: Solicitudes y asignación (Semanas 5 y 6)

**Objetivo:** Que un ticket se registre y llegue a un agente.

| ID | Épica | Historia | Rol | Estado |
|---|---|---|---|---|
| HU-01-01 | EP-01 | Registrar una solicitud de soporte | Solicitante | Por hacer |
| HU-01-03 | EP-01 | Consultar mis solicitudes | Solicitante | Por hacer |
| HU-01-05 | EP-01 | Consultar el detalle y el responsable de atención | Solicitante | Por hacer |
| HU-03-02 | EP-03 | Identificar solicitudes que necesitan asignación | Supervisor | Por hacer |
| HU-03-03 | EP-03 | Asignar un ticket al equipo y agente adecuados | Supervisor | Por hacer |

## Sprint 3: Atención y cierre (Semanas 7 y 8)

**Objetivo:** Que el ticket se atienda, se resuelva y se cierre.

| ID | Épica | Historia | Rol | Estado |
|---|---|---|---|---|
| HU-02-01 | EP-02 | Actualizar el estado de un ticket | Agente | Por hacer |
| HU-02-02 | EP-02 | Registrar el trabajo realizado | Agente | Por hacer |
| HU-02-05 | EP-02 | Documentar la solución y resolver el ticket | Agente | Por hacer |
| HU-02-06 | EP-02 | Cerrar un ticket cuando termina su atención | Agente | Por hacer |
| HU-01-08 | EP-01 | Consultar la solución de una solicitud | Solicitante | Por hacer |

## Sprint 4: Prioridad y Telegram (Semanas 9 y 10)

**Objetivo:** Que haya fechas límite y avisos por Telegram.

| ID | Épica | Historia | Rol | Estado |
|---|---|---|---|---|
| HU-04-01 | EP-04 | Determinar la prioridad de una solicitud | Supervisor | Por hacer |
| HU-04-03 | EP-04 | Conocer las fechas límite de atención | Agente | Por hacer |
| HU-05-09 | EP-05 | Vincular una identidad de Telegram | Solicitante | Por hacer |
| HU-06-08 | EP-06 | Recibir avisos en la aplicación y en Telegram | Todos | Por hacer |

Nota: los tiempos de SLA usan valores fijos de ejemplo en el MVP; su configuración completa (EP-09) queda para después.

## Sprint 5: Pruebas y entrega (Semanas 11 y 12)

**Objetivo:** corregir, probar con usuarios reales y presentar el MVP.

| # | Tarea | Responsable | Estado |
|---|---|---|---|
| S5-01 | Pruebas del recorrido completo del ticket | | Por hacer |
| S5-02 | Ajustes según la opinión del cliente | | Por hacer |
| S5-03 | Documentación de uso | | Por hacer |

## Fuera del MVP (Product Backlog restante)

78 historias para fases posteriores: base de conocimiento (EP-07), reportes y satisfacción (EP-08), reasignación y transferencia, escalamiento, auditoría y respaldos, y el resto de EP-01 a EP-06 y EP-09. El detalle está en `UserStoryMapping.md`.
