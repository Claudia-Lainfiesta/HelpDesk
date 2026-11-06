import { Routes } from '@angular/router';
import { autenticadoGuard, invitadoGuard, rolGuard } from './core/auth/guardas';
import { rutasDesarrollo } from './rutas-desarrollo';

export const routes: Routes = [
  ...rutasDesarrollo,
  {
    path: 'iniciar-sesion',
    title: 'Iniciar sesión · HelpDesk',
    canActivate: [invitadoGuard],
    loadComponent: () =>
      import('./features/acceso/iniciar-sesion').then((modulo) => modulo.IniciarSesion),
  },
  {
    path: 'recuperar-contrasena',
    title: 'Recuperar contraseña · HelpDesk',
    canActivate: [invitadoGuard],
    loadComponent: () =>
      import('./features/informacion/recuperar-contrasena').then(
        (modulo) => modulo.RecuperarContrasena,
      ),
  },
  {
    path: 'cambiar-contrasena',
    title: 'Cambiar contraseña · HelpDesk',
    canActivate: [autenticadoGuard],
    loadComponent: () =>
      import('./features/acceso/cambiar-contrasena').then((modulo) => modulo.CambiarContrasena),
  },
  {
    path: '',
    canActivate: [autenticadoGuard],
    canActivateChild: [autenticadoGuard],
    loadComponent: () => import('./layout/app-shell').then((modulo) => modulo.AppShell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'tickets' },
      {
        path: 'tickets',
        title: 'Tickets · HelpDesk',
        loadComponent: () => import('./features/tickets/tickets').then((modulo) => modulo.Tickets),
      },
      {
        path: 'categorias',
        title: 'Categorías · HelpDesk',
        canActivate: [rolGuard('administrador')],
        loadComponent: () =>
          import('./features/categorias/categorias').then((modulo) => modulo.Categorias),
      },
      {
        path: 'usuarios',
        title: 'Usuarios · HelpDesk',
        canActivate: [rolGuard('administrador')],
        loadComponent: () =>
          import('./features/usuarios/usuarios').then((modulo) => modulo.Usuarios),
      },
      {
        path: 'reportes',
        title: 'Reportes · HelpDesk',
        canActivate: [rolGuard('supervisor', 'administrador')],
        data: { titulo: 'Reportes' },
        loadComponent: () =>
          import('./features/informacion/pagina-informativa').then(
            (modulo) => modulo.PaginaInformativa,
          ),
      },
      {
        path: 'sin-permiso',
        title: 'Sin permiso · HelpDesk',
        data: {
          titulo: 'Sin permiso',
          mensaje: 'Tu cuenta no tiene permiso para acceder a esta sección.',
        },
        loadComponent: () =>
          import('./features/informacion/pagina-informativa').then(
            (modulo) => modulo.PaginaInformativa,
          ),
      },
    ],
  },
  {
    path: '**',
    title: 'Página no encontrada · HelpDesk',
    data: {
      titulo: 'Página no encontrada',
      mensaje: 'La dirección que buscas no está disponible.',
    },
    loadComponent: () =>
      import('./features/informacion/pagina-informativa').then(
        (modulo) => modulo.PaginaInformativa,
      ),
  },
];
