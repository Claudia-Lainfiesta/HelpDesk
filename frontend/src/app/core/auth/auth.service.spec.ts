import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { usuarioPrueba } from '../../pruebas/usuario';

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('inicia sesión, recorta el correo y actualiza las señales de carga', () => {
    auth.iniciarSesion(' ana@empresa.com ', 'entrada-prueba').subscribe();
    expect(auth.cargando()).toBe(true);
    const peticion = http.expectOne('/api/auth/login');
    expect(peticion.request.body.email).toBe('ana@empresa.com');
    peticion.flush(usuarioPrueba);
    expect(auth.usuario()).toEqual(usuarioPrueba);
    expect(auth.cargando()).toBe(false);
  });
  it('evita un segundo envío y conserva la sesión nula ante credenciales incorrectas', () => {
    let fallo = false;
    auth
      .iniciarSesion('ana@empresa.com', 'entrada-prueba')
      .subscribe({ error: () => (fallo = true) });
    auth.iniciarSesion('ana@empresa.com', 'entrada-prueba').subscribe();
    const peticion = http.expectOne('/api/auth/login');
    peticion.flush(
      { error: { code: 'INVALID_CREDENTIALS', message: 'Credenciales incorrectas' } },
      { status: 401, statusText: 'Unauthorized' },
    );
    expect(fallo).toBe(true);
    expect(auth.usuario()).toBeNull();
    expect(auth.cargando()).toBe(false);
  });
  it('restaura la sesión con me y cierra mediante un cuerpo JSON vacío', () => {
    auth.cargarSesion().subscribe();
    http.expectOne('/api/auth/me').flush(usuarioPrueba);
    expect(auth.usuario()?.id).toBe('1');
    auth.cerrarSesion().subscribe();
    const peticion = http.expectOne('/api/auth/logout');
    expect(peticion.request.body).toEqual({});
    peticion.flush(null);
    expect(auth.usuario()).toBeNull();
  });
  it('una restauración sin cookie no interrumpe el arranque', () => {
    let completada = false;
    auth.cargarSesion().subscribe(() => (completada = true));
    http.expectOne('/api/auth/me').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(completada).toBe(true);
    expect(auth.usuario()).toBeNull();
  });
  it('cambia contraseña y conserva el perfil actualizado', () => {
    auth.cambiarContrasena('entrada-prueba', 'nueva-entrada-prueba').subscribe();
    const peticion = http.expectOne('/api/auth/change-password');
    expect(peticion.request.method).toBe('POST');
    peticion.flush({ ...usuarioPrueba, mustChangePassword: false });
    expect(auth.usuario()?.mustChangePassword).toBe(false);
  });
});
