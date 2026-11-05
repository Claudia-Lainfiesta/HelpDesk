import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { autenticadoGuard, invitadoGuard, rolGuard } from './guardas';
import { AuthService } from './auth.service';
import { Usuario } from './modelos';
import { usuarioPrueba } from '../../pruebas/usuario';
import { rutaInterna } from './ruta-interna';

describe('Guardas y rutas de retorno', () => {
  const usuario = signal<Usuario | null>(null);
  beforeEach(() => {
    usuario.set(null);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: { usuario } }],
    });
  });
  const ejecutar = (guarda: CanActivateFn, url = '/tickets') =>
    TestBed.runInInjectionContext(() =>
      guarda({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );
  const url = (resultado: unknown) => TestBed.inject(Router).serializeUrl(resultado as UrlTree);
  it('sin sesión vuelve a login conservando la ruta y con sesión permite pasar', () => {
    expect(url(ejecutar(autenticadoGuard))).toContain('/iniciar-sesion?returnUrl=');
    usuario.set(usuarioPrueba);
    expect(ejecutar(autenticadoGuard)).toBe(true);
  });
  it('deniega un rol y permite el autorizado', () => {
    usuario.set(usuarioPrueba);
    expect(url(ejecutar(rolGuard('administrador')))).toBe('/sin-permiso');
    usuario.set({ ...usuarioPrueba, role: 'administrador' });
    expect(ejecutar(rolGuard('administrador'))).toBe(true);
  });
  it('la contraseña temporal obliga a cambiarla en todas las rutas protegidas', () => {
    usuario.set({ ...usuarioPrueba, mustChangePassword: true });
    expect(url(ejecutar(autenticadoGuard))).toBe('/cambiar-contrasena');
    expect(ejecutar(autenticadoGuard, '/cambiar-contrasena')).toBe(true);
    expect(url(ejecutar(rolGuard('administrador')))).toBe('/cambiar-contrasena');
  });
  it('invitado redirige a un usuario ya conectado', () => {
    expect(ejecutar(invitadoGuard)).toBe(true);
    usuario.set(usuarioPrueba);
    expect(url(ejecutar(invitadoGuard))).toBe('/tickets');
    usuario.set({ ...usuarioPrueba, mustChangePassword: true });
    expect(url(ejecutar(invitadoGuard))).toBe('/cambiar-contrasena');
  });
  it.each([
    'https://externo.invalid',
    '//externo.invalid',
    '/%2fexterno.invalid',
    '/\\externo.invalid',
    'javascript:alert(1)',
    '/iniciar-sesion',
    '/%00x',
    '%',
  ])('rechaza retorno externo, inválido o circular: %s', (destino) => {
    expect(rutaInterna(destino)).toBe('/tickets');
  });
  it('conserva una ruta interna con parámetros', () =>
    expect(rutaInterna('/reportes?periodo=mes')).toBe('/reportes?periodo=mes'));
});
