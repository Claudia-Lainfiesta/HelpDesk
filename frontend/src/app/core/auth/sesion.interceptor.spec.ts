import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { sesionInterceptor } from './sesion.interceptor';
import { AuthService } from './auth.service';
import { usuarioPrueba } from '../../pruebas/usuario';

describe('Interceptor de sesión', () => {
  let http: HttpTestingController;
  let cliente: HttpClient;
  let router: Router;
  let auth: AuthService;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([sesionInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    cliente = TestBed.inject(HttpClient);
    router = TestBed.inject(Router);
    auth = TestBed.inject(AuthService);
  });
  afterEach(() => http.verify());
  it('añade credenciales solo a la API y asegura JSON en escrituras sin cuerpo', () => {
    cliente.post('/api/operacion', null).subscribe();
    const peticion = http.expectOne('/api/operacion');
    expect(peticion.request.withCredentials).toBe(true);
    expect(peticion.request.body).toEqual({});
    expect(peticion.request.headers.get('Content-Type')).toBe('application/json');
    peticion.flush({});
    cliente.get('/archivo').subscribe();
    const externa = http.expectOne('/archivo');
    expect(externa.request.withCredentials).toBe(false);
    externa.flush({});
  });
  it('401 limpia usuario y conserva returnUrl', () => {
    auth.cargarSesion().subscribe();
    http.expectOne('/api/auth/me').flush(usuarioPrueba);
    vi.spyOn(router, 'url', 'get').mockReturnValue('/tickets?estado=creado');
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    cliente.get('/api/privada').subscribe({ error: () => undefined });
    http.expectOne('/api/privada').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.usuario()).toBeNull();
    expect(auth.sesionTerminada()).toBe(true);
    expect(navegar).toHaveBeenCalledWith(['/iniciar-sesion'], {
      queryParams: { returnUrl: '/tickets?estado=creado' },
    });
  });
  it('redirige el cambio obligatorio y actualiza el perfil', () => {
    auth.cargarSesion().subscribe();
    http.expectOne('/api/auth/me').flush(usuarioPrueba);
    const navegar = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    cliente.get('/api/privada').subscribe({ error: () => undefined });
    http.expectOne('/api/privada').flush(
      {
        error: {
          code: 'PASSWORD_CHANGE_REQUIRED',
          message: 'Debes cambiar la contraseña temporal.',
        },
      },
      { status: 403, statusText: 'Forbidden' },
    );
    expect(navegar).toHaveBeenCalledWith('/cambiar-contrasena');
    expect(auth.usuario()?.mustChangePassword).toBe(true);
  });
  it('un error de credenciales en login o cambio de contraseña se muestra sin terminar la sesión', () => {
    auth.cargarSesion().subscribe();
    http.expectOne('/api/auth/me').flush(usuarioPrueba);
    const navegar = vi.spyOn(router, 'navigate');
    auth
      .cambiarContrasena('entrada-prueba', 'nueva-entrada-prueba')
      .subscribe({ error: (error) => expect(error.message).toBe('Credenciales incorrectas') });
    http
      .expectOne('/api/auth/change-password')
      .flush(
        { error: { code: 'INVALID_CREDENTIALS', message: 'Credenciales incorrectas' } },
        { status: 401, statusText: 'Unauthorized' },
      );
    expect(navegar).not.toHaveBeenCalled();
    expect(auth.usuario()).not.toBeNull();
  });
  it('la restauración sin sesión no anuncia un vencimiento ni redirige', () => {
    const navegar = vi.spyOn(router, 'navigate');
    auth.cargarSesion().subscribe();
    http.expectOne('/api/auth/me').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(navegar).not.toHaveBeenCalled();
    expect(auth.sesionTerminada()).toBe(false);
  });
});
