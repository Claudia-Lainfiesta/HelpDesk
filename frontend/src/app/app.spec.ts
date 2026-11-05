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
      expect(pagina.routeNativeElement!.textContent).toContain('Datos de ejemplo');
      expect(pagina.routeNativeElement!.querySelectorAll('app-tarjeta[role="row"]')).toHaveLength(
        6,
      );
      http.expectNone('/api/tickets');
      http.expectNone('/api/health');
    },
  );
  it('un acceso directo no autorizado muestra Sin permiso', async () => {
    restaurar('agente');
    const pagina = await RouterTestingHarness.create('/usuarios');
    expect(TestBed.inject(Router).url).toBe('/sin-permiso');
    expect(pagina.routeNativeElement!.textContent).toContain('Sin permiso');
  });
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
  it('filtra los ejemplos por texto y estado sin pedir tickets al servidor', async () => {
    restaurar('agente');
    const pagina = await RouterTestingHarness.create('/tickets');
    const elemento = pagina.routeNativeElement!;
    const campo = elemento.querySelector<HTMLInputElement>('input[type="search"]')!;
    campo.value = 'VPN';
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    pagina.detectChanges();
    expect(elemento.querySelectorAll('app-tarjeta[role="row"]')).toHaveLength(1);
    campo.value = '';
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    pagina.detectChanges();
    const filtro = Array.from(
      elemento.querySelectorAll<HTMLButtonElement>('app-filtro button'),
    ).find((boton) => boton.textContent?.trim() === 'Creado')!;
    filtro.click();
    pagina.detectChanges();
    expect(elemento.querySelectorAll('app-tarjeta[role="row"]')).toHaveLength(1);
    expect(elemento.querySelector('[role="rowgroup"]')?.textContent).toContain('TK-000128');
  });
});
