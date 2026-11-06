import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { Rol } from './core/auth/modelos';
import { usuarioPrueba } from './pruebas/usuario';

describe('Aplicación y navegación', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  function restaurar(role: Rol, mustChangePassword = false) {
    TestBed.inject(AuthService).cargarSesion().subscribe();
    http.expectOne('/api/auth/me').flush({ ...usuarioPrueba, role, mustChangePassword });
  }
  it.each([
    ['solicitante', ['/tickets']],
    ['agente', ['/tickets']],
    ['supervisor', ['/tickets', '/reportes']],
    ['administrador', ['/tickets', '/categorias', '/usuarios', '/reportes']],
  ] as [Rol, string[]][])(
    'muestra la navegación de %s tras restaurar con me',
    async (rol, enlaces) => {
      restaurar(rol);
      const pagina = await RouterTestingHarness.create('/tickets');
      const navegacion = Array.from(pagina.routeNativeElement!.querySelectorAll('nav a')).map(
        (enlace) => enlace.getAttribute('href'),
      );
      expect(navegacion).toEqual(enlaces);
      http.expectOne((r) => r.url === '/api/categories').flush({ data: [] });
      http
        .expectOne((r) => r.url === '/api/tickets')
        .flush({ data: [], total: 0, page: 1, pageSize: 20 });
      await pagina.fixture.whenStable();
      expect(pagina.routeNativeElement!.textContent).toContain('Todavía no hay tickets.');
      http.expectNone('/api/health');
    },
  );
  it.each(['/usuarios', '/categorias'])(
    'un acceso directo a %s no autorizado muestra Sin permiso',
    async (ruta) => {
      restaurar('agente');
      const pagina = await RouterTestingHarness.create(ruta);
      expect(TestBed.inject(Router).url).toBe('/sin-permiso');
      expect(pagina.routeNativeElement!.textContent).toContain('Sin permiso');
    },
  );
  it('una contraseña temporal no permite salir del cambio obligatorio', async () => {
    restaurar('administrador', true);
    const pagina = await RouterTestingHarness.create('/tickets');
    expect(TestBed.inject(Router).url).toBe('/cambiar-contrasena');
    expect(pagina.routeNativeElement!.querySelector('nav')).toBeNull();
  });
  it('sin sesión vuelve a iniciar sesión', async () => {
    await RouterTestingHarness.create('/tickets');
    expect(TestBed.inject(Router).url).toContain('/iniciar-sesion?returnUrl=');
  });
});
