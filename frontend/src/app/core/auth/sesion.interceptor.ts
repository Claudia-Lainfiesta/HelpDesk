import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, mergeMap, throwError } from 'rxjs';
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
  const multipart = cuerpo instanceof FormData;
  const segura = peticion.clone({
    withCredentials: true,
    ...(multipart ? { headers: peticion.headers.delete('Content-Type') } : {}),
    ...(escritura
      ? {
          body: typeof cuerpo === 'string' ? JSON.stringify(cuerpo) : cuerpo,
          ...(multipart ? {} : { setHeaders: { 'Content-Type': 'application/json' } }),
        }
      : {}),
  });
  const rechazar = (error: unknown) => {
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
  };
  return siguiente(segura).pipe(
    catchError((error: unknown) => {
      // HttpClient también entrega como Blob los errores JSON de imágenes y CSV.
      if (
        error instanceof HttpErrorResponse &&
        error.error instanceof Blob &&
        error.error.type.includes('application/json') &&
        error.error.size <= 100 * 1024
      ) {
        return from(
          error.error.text().then(
            (texto) => {
              try {
                return new HttpErrorResponse({
                  error: JSON.parse(texto),
                  headers: error.headers,
                  status: error.status,
                  statusText: error.statusText,
                  ...(error.url ? { url: error.url } : {}),
                });
              } catch {
                return error;
              }
            },
            () => error,
          ),
        ).pipe(mergeMap(rechazar));
      }
      return rechazar(error);
    }),
  );
};
