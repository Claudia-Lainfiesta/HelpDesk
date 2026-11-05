import { Routes } from '@angular/router';
export const rutasDesarrollo: Routes = [
  {
    path: 'guia-ui',
    title: 'Guía de interfaz · HelpDesk',
    loadComponent: () => import('./features/guia-ui/guia-ui').then((modulo) => modulo.GuiaUi),
  },
];
