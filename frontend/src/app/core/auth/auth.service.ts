import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpContext, HttpContextToken } from '@angular/common/http';
import { EMPTY, catchError, defer, finalize, map, of, tap, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Usuario } from './modelos';

export const RESTAURANDO_SESION = new HttpContextToken(() => false);
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly actual = signal<Usuario | null>(null);
  readonly usuario = this.actual.asReadonly();
  readonly cargando = signal(false);
  readonly sesionTerminada = signal(false);

  iniciarSesion(email: string, password: string) {
    return defer(() => {
      if (this.cargando()) return EMPTY;
      this.cargando.set(true);
      return this.http
        .post<Usuario>(`${environment.apiBaseUrl}/auth/login`, { email: email.trim(), password })
        .pipe(
          tap((usuario) => {
            this.actual.set(usuario);
            this.sesionTerminada.set(false);
          }),
          finalize(() => this.cargando.set(false)),
        );
    });
  }
  cargarSesion() {
    return defer(() => {
      this.cargando.set(true);
      return this.http
        .get<Usuario>(`${environment.apiBaseUrl}/auth/me`, {
          context: new HttpContext().set(RESTAURANDO_SESION, true),
        })
        .pipe(
          timeout(8000),
          tap((usuario) => this.actual.set(usuario)),
          map(() => undefined),
          catchError(() => {
            this.actual.set(null);
            return of(undefined);
          }),
          finalize(() => this.cargando.set(false)),
        );
    });
  }
  cerrarSesion() {
    return defer(() => {
      if (this.cargando()) return EMPTY;
      this.cargando.set(true);
      return this.http.post<void>(`${environment.apiBaseUrl}/auth/logout`, {}).pipe(
        tap(() => this.limpiarSesion()),
        finalize(() => this.cargando.set(false)),
      );
    });
  }
  cambiarContrasena(currentPassword: string, newPassword: string) {
    return defer(() => {
      if (this.cargando()) return EMPTY;
      this.cargando.set(true);
      return this.http
        .post<Usuario>(`${environment.apiBaseUrl}/auth/change-password`, {
          currentPassword,
          newPassword,
        })
        .pipe(
          tap((usuario) => this.actual.set(usuario)),
          finalize(() => this.cargando.set(false)),
        );
    });
  }
  limpiarSesion(terminada = false) {
    this.actual.set(null);
    this.sesionTerminada.set(terminada);
  }
  exigirCambioContrasena() {
    this.actual.update((usuario) => (usuario ? { ...usuario, mustChangePassword: true } : null));
  }
}
