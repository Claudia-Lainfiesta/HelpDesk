import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { RecuperarContrasena } from './recuperar-contrasena';
import { sesionInterceptor } from '../../core/auth/sesion.interceptor';

describe('Recuperación asistida', () => {
  let fixture: ComponentFixture<RecuperarContrasena>;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'iniciar-sesion', component: RecuperarContrasena }]),
        provideHttpClient(withInterceptors([sesionInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(RecuperarContrasena);
    fixture.detectChanges();
  });
  afterEach(() => http.verify());
  function escribir(valor: string) {
    const campo = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    campo.value = valor;
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    campo.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  }
  function enviar() {
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
  }
  it.each(['', 'incorrecto', 'a'.repeat(255) + '@example.invalid'])(
    'rechaza correo vacío o inválido: %s',
    (valor) => {
      escribir(valor);
      enviar();
      expect(fixture.nativeElement.textContent).toContain('Escribe un correo válido');
      http.expectNone('/api/auth/recovery-request');
    },
  );
  it('recorta el correo, envía JSON con credenciales y evita doble envío durante carga', async () => {
    escribir(' persona@example.invalid ');
    enviar();
    enviar();
    const req = http.expectOne('/api/auth/recovery-request');
    expect(req.request.body).toEqual({ email: 'persona@example.invalid' });
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.headers.get('Content-Type')).toBe('application/json');
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('input').autocomplete).toBe('username');
    req.flush({ message: 'Mensaje público genérico' });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('input').value).toBe('');
    expect(fixture.nativeElement.textContent).toContain('Solicitud recibida');
    expect(fixture.nativeElement.textContent).toContain('no confirmamos si la cuenta existe');
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(false);
  });
  it.each(['habilitada', 'inexistente', 'inactiva', 'vencida'])(
    'mantiene la misma respuesta visual para %s sin conservar el correo',
    async (caso) => {
      const email = `${caso}@example.invalid`;
      const url = TestBed.inject(Router).url;
      const log = vi.spyOn(console, 'log');
      escribir(email);
      enviar();
      http
        .expectOne('/api/auth/recovery-request')
        .flush({ message: 'Respuesta genérica del servidor' });
      await fixture.whenStable();
      expect(fixture.nativeElement.textContent).toContain(
        'Solicitud recibida. Si el correo corresponde a una cuenta habilitada, administración recibirá un aviso. Por seguridad no confirmamos si la cuenta existe.',
      );
      expect(fixture.nativeElement.textContent).not.toContain(email);
      expect(localStorage.length).toBe(0);
      expect(sessionStorage.length).toBe(0);
      expect(TestBed.inject(Router).url).toBe(url);
      expect(JSON.stringify(log.mock.calls)).not.toContain(email);
    },
  );
  it('presenta el límite 429 sin identificar el correo', async () => {
    escribir('persona@example.invalid');
    enviar();
    http.expectOne('/api/auth/recovery-request').flush(
      {
        error: {
          code: 'RECOVERY_RATE_LIMIT',
          message: 'Has realizado demasiadas solicitudes. Intenta más tarde.',
        },
      },
      { status: 429, statusText: 'Too Many Requests' },
    );
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Has realizado demasiadas solicitudes. Intenta más tarde.',
    );
    expect(fixture.componentInstance.exito()).toBe(false);
  });
  it('un fallo de conexión usa el mensaje genérico existente', async () => {
    escribir('persona@example.invalid');
    enviar();
    http.expectOne('/api/auth/recovery-request').error(new ProgressEvent('error'));
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('No pudimos conectar con el servidor');
  });
  it('el enlace vuelve a iniciar sesión', async () => {
    const enlace = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    expect(enlace.getAttribute('href')).toBe('/iniciar-sesion');
    enlace.click();
    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/iniciar-sesion');
  });
});
