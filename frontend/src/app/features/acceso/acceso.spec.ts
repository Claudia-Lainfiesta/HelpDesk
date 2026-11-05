import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { IniciarSesion } from './iniciar-sesion';
import { CambiarContrasena } from './cambiar-contrasena';
import { AuthService } from '../../core/auth/auth.service';
import { usuarioPrueba } from '../../pruebas/usuario';

function escribir(fixture: ComponentFixture<unknown>, identificador: string, valor: string) {
  const campo = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
    `input[id="${identificador}"]`,
  )!;
  campo.value = valor;
  campo.dispatchEvent(new Event('input', { bubbles: true }));
  campo.dispatchEvent(new Event('blur'));
  fixture.detectChanges();
}
function enviar(fixture: ComponentFixture<unknown>) {
  fixture.nativeElement
    .querySelector('form')
    .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  fixture.detectChanges();
}

describe('Inicio de sesión', () => {
  let fixture: ComponentFixture<IniciarSesion>;
  let http: HttpTestingController;
  let navegar: ReturnType<typeof vi.spyOn>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(IniciarSesion);
    fixture.detectChanges();
  });
  afterEach(() => http.verify());
  it('valida correo y contraseña antes de enviar', () => {
    enviar(fixture);
    expect(fixture.nativeElement.textContent).toContain('Escribe un correo válido');
    http.expectNone('/api/auth/login');
    escribir(fixture, 'correo', 'sin-formato');
    escribir(fixture, 'contrasena', 'entrada-prueba');
    enviar(fixture);
    http.expectNone('/api/auth/login');
  });
  it('muestra carga, evita doble envío y presenta el 401 genérico de la API', async () => {
    escribir(fixture, 'correo', 'ana@empresa.com');
    escribir(fixture, 'contrasena', 'entrada-prueba');
    enviar(fixture);
    enviar(fixture);
    const peticion = http.expectOne('/api/auth/login');
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
    peticion.flush(
      { error: { code: 'INVALID_CREDENTIALS', message: 'Credenciales incorrectas' } },
      { status: 401, statusText: 'Unauthorized' },
    );
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Credenciales incorrectas',
    );
    expect(
      (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
        'input[id="contrasena"]',
      )!.value,
    ).toBe('');
  });
  it.each(['https://externo.invalid', '//externo.invalid', '/%2fexterno.invalid'])(
    'no acepta returnUrl externo: %s',
    async (destino) => {
      TestBed.inject(ActivatedRoute).snapshot.queryParams = { returnUrl: destino };
      escribir(fixture, 'correo', 'ana@empresa.com');
      escribir(fixture, 'contrasena', 'entrada-prueba');
      enviar(fixture);
      http.expectOne('/api/auth/login').flush(usuarioPrueba);
      await fixture.whenStable();
      expect(navegar).toHaveBeenCalledWith('/tickets');
    },
  );
  it('regresa a una ruta interna y prioriza el cambio obligatorio', async () => {
    TestBed.inject(ActivatedRoute).snapshot.queryParams = { returnUrl: '/reportes' };
    escribir(fixture, 'correo', 'ana@empresa.com');
    escribir(fixture, 'contrasena', 'entrada-prueba');
    enviar(fixture);
    http.expectOne('/api/auth/login').flush({ ...usuarioPrueba, mustChangePassword: true });
    await fixture.whenStable();
    expect(navegar).toHaveBeenCalledWith('/cambiar-contrasena');
  });
  it('comunica que la sesión terminó', async () => {
    TestBed.inject(AuthService).limpiarSesion(true);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain(
      'Tu sesión terminó. Inicia sesión de nuevo.',
    );
  });
});

describe('Cambio de contraseña', () => {
  let fixture: ComponentFixture<CambiarContrasena>;
  let http: HttpTestingController;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthService).cargarSesion().subscribe();
    http.expectOne('/api/auth/me').flush({ ...usuarioPrueba, mustChangePassword: true });
    fixture = TestBed.createComponent(CambiarContrasena);
    fixture.detectChanges();
  });
  afterEach(() => http.verify());
  it('modo obligatorio no muestra navegación y permite cerrar sesión', () => {
    expect(fixture.nativeElement.querySelector('nav')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Tu contraseña es temporal');
    expect(fixture.nativeElement.textContent).toContain('Cerrar sesión');
  });
  it('valida longitud, diferencia del correo y confirmación', () => {
    escribir(fixture, 'actual', 'entrada-prueba');
    escribir(fixture, 'nueva', 'corta');
    escribir(fixture, 'confirmacion', 'distinta');
    enviar(fixture);
    expect(fixture.nativeElement.textContent).toContain('Las contraseñas no coinciden');
    http.expectNone('/api/auth/change-password');
    escribir(fixture, 'nueva', usuarioPrueba.email);
    escribir(fixture, 'confirmacion', usuarioPrueba.email);
    enviar(fixture);
    http.expectNone('/api/auth/change-password');
    escribir(fixture, 'nueva', 'entrada-prueba');
    escribir(fixture, 'confirmacion', 'entrada-prueba');
    enviar(fixture);
    expect(fixture.nativeElement.textContent).toContain('distinta de la actual');
    http.expectNone('/api/auth/change-password');
  });
  it('muestra los mensajes de la API al fallar y limpia los campos', async () => {
    escribir(fixture, 'actual', 'entrada-prueba');
    escribir(fixture, 'nueva', 'nueva-entrada-prueba');
    escribir(fixture, 'confirmacion', 'nueva-entrada-prueba');
    enviar(fixture);
    http
      .expectOne('/api/auth/change-password')
      .flush(
        { error: { code: 'INVALID_CREDENTIALS', message: 'Credenciales incorrectas' } },
        { status: 401, statusText: 'Unauthorized' },
      );
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Credenciales incorrectas',
    );
    expect(
      (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input[id="actual"]')!
        .value,
    ).toBe('');
  });
  it('guarda correctamente y vuelve a tickets', async () => {
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    escribir(fixture, 'actual', 'entrada-prueba');
    escribir(fixture, 'nueva', 'nueva-entrada-prueba');
    escribir(fixture, 'confirmacion', 'nueva-entrada-prueba');
    enviar(fixture);
    http.expectOne('/api/auth/change-password').flush(usuarioPrueba);
    await fixture.whenStable();
    expect(navegar).toHaveBeenCalledWith('/tickets');
  });
});
