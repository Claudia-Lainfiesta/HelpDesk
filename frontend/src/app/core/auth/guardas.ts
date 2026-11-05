import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Rol } from './modelos';

export const autenticadoGuard: CanActivateFn = (_ruta, estado) => {
  const usuario = inject(AuthService).usuario();
  const router = inject(Router);
  if (!usuario)
    return router.createUrlTree(['/iniciar-sesion'], { queryParams: { returnUrl: estado.url } });
  if (usuario.mustChangePassword && estado.url.split('?')[0] !== '/cambiar-contrasena')
    return router.parseUrl('/cambiar-contrasena');
  return true;
};
export const invitadoGuard: CanActivateFn = () => {
  const usuario = inject(AuthService).usuario();
  return usuario
    ? inject(Router).parseUrl(usuario.mustChangePassword ? '/cambiar-contrasena' : '/tickets')
    : true;
};
export function rolGuard(...roles: Rol[]): CanActivateFn {
  return (ruta, estado) => {
    const acceso = autenticadoGuard(ruta, estado);
    if (acceso !== true) return acceso;
    return roles.includes(inject(AuthService).usuario()!.role)
      ? true
      : inject(Router).parseUrl('/sin-permiso');
  };
}
