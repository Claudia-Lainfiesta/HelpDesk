# HelpDesk

Sistema de mesa de ayuda con Angular, Express y PostgreSQL. Conserva autenticación
local por sesión y roles solicitante, agente, supervisor y administrador.
[Estado funcional v1](docs/project-status.md).

## Desarrollo local

Consulta [backend](backend/README.md) y [frontend](frontend/README.md). Cada proyecto
conserva su package-lock y sus comandos de desarrollo/check.

## Producción: Render + PostgreSQL de Supabase

Una única Web Service sirve Angular y `/api` desde el mismo origen HTTPS.
Supabase se utiliza exclusivamente como PostgreSQL mediante `DATABASE_URL` y TLS
verificado; no se utiliza Supabase Auth, SDK ni Storage.

Desde la raíz, con Node 22.23.1:

```bash
npm run build:production
npm run start:production
```

El build instala ambos proyectos con sus lockfiles (incluyendo herramientas de
compilación), construye Angular y verifica que la guía UI queda excluida, limpia
el output backend y compila Express. El start solo ejecuta el backend compilado;
necesita sus variables de producción. No migra, no hace seed ni inicia Angular CLI.
Salida Angular: `frontend/dist/HelpDesk/browser/`.

**Configuración completa, comandos de Supabase, variables Render y pasos:**
[Despliegue Render + Supabase](docs/deployment-render-supabase.md).

Los scripts raíz `db:check`, `db:migrate`, `db:status` y `user:create-admin` usan
el backend compilado. No hay seed de producción. No publiques `.env`, URIs,
contraseñas, claves SMTP ni tokens Telegram.
