import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService, RESTAURANDO_SESION } from './auth.service';
import { interpretarError } from './fallo-api';
import { rutaInterna } from './ruta-interna';

export const sesionInterceptor: HttpInterceptorFn = (peticion, siguiente) => {
  const base = environment.apiBaseUrl;
  if (!(peticion.url === base || peticion.url.startsWith(`${base}/`))) return siguiente(peticion);
  const auth = inject(AuthService);
  const router = inject(Router);
  const escritura = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(peticion.method);
  const cuerpo = peticion.body ?? {};
  const segura = peticion.clone({
    withCredentials: true,
    ...(escritura
      ? {
          body: typeof cuerpo === 'string' ? JSON.stringify(cuerpo) : cuerpo,
          setHeaders: { 'Content-Type': 'application/json' },
        }
      : {}),
  });
  return siguiente(segura).pipe(
    catchError((error: unknown) => {
      const fallo = interpretarError(error);
      const credenciales =
        peticion.url.endsWith('/auth/login') ||
        (peticion.url.endsWith('/auth/change-password') && fallo.codigo === 'INVALID_CREDENTIALS');
      if (
        fallo.estado === 401 &&
        !credenciales &&
        !peticion.context.get(RESTAURANDO_SESION) &&
        !router.url.startsWith('/iniciar-sesion')
      ) {
        const destino = rutaInterna(router.url);
        auth.limpiarSesion(true);
        void router.navigate(['/iniciar-sesion'], { queryParams: { returnUrl: destino } });
      } else if (fallo.estado === 403 && fallo.codigo === 'PASSWORD_CHANGE_REQUIRED') {
        auth.exigirCambioContrasena();
        void router.navigateByUrl('/cambiar-contrasena');
      }
      return throwError(() => fallo);
    }),
  );
};
