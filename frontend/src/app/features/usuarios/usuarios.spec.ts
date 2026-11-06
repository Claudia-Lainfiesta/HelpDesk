import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter, convertToParamMap } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { fechaParaCampo } from '../../core/administracion/fechas';
import { Usuarios, leerFiltros } from './usuarios';
import { FormularioUsuario } from './formulario-usuario';
import { AuthService } from '../../core/auth/auth.service';
import { cuentaPrueba } from '../../pruebas/administracion';
import { usuarioPrueba } from '../../pruebas/usuario';
import { CuentaConClave } from '../../core/administracion/modelos';

function escribir(e: HTMLElement, id: string, valor: string) {
  const c = e.querySelector<HTMLInputElement>(`input[id="${id}"]`)!;
  c.value = valor;
  c.dispatchEvent(new Event('input', { bubbles: true }));
  c.dispatchEvent(new Event('blur'));
}

describe('Pantalla de usuarios', () => {
  let http: HttpTestingController;
  let pagina: RouterTestingHarness;
  let componente: Usuarios;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  async function abrir(url = '/usuarios') {
    TestBed.inject(AuthService).cargarSesion().subscribe();
    http.expectOne('/api/auth/me').flush({ ...usuarioPrueba, role: 'administrador' });
    pagina = await RouterTestingHarness.create(url);
    componente = pagina.fixture.debugElement.query(By.directive(Usuarios)).componentInstance;
  }
  function lista(data = [cuentaPrueba()], total = data.length) {
    http
      .expectOne((r) => r.url === '/api/users')
      .flush({
        data,
        total,
        page: componente.filtros().page,
        pageSize: componente.filtros().pageSize,
      });
    pagina.detectChanges();
  }
  it('muestra carga, vacío y sugerencia', async () => {
    await abrir();
    expect(pagina.routeNativeElement!.textContent).toContain('Cargando usuarios');
    lista([]);
    await pagina.fixture.whenStable();
    expect(pagina.routeNativeElement!.textContent).toContain('No hay usuarios');
    expect(pagina.routeNativeElement!.textContent).toContain('otros filtros');
  });
  it('muestra el error real y reintenta', async () => {
    await abrir();
    http
      .expectOne((r) => r.url === '/api/users')
      .flush(
        { error: { code: 'ERROR_API', message: 'Servidor no disponible' } },
        { status: 503, statusText: 'Unavailable' },
      );
    await pagina.fixture.whenStable();
    expect(pagina.routeNativeElement!.textContent).toContain('Servidor no disponible');
    Array.from(pagina.routeNativeElement!.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Reintentar'))!
      .click();
    lista();
    await pagina.fixture.whenStable();
    expect(pagina.routeNativeElement!.textContent).toContain('Persona de prueba');
  });
  it('restaura filtros de la URL y pagina preservándolos', async () => {
    await abrir(
      '/usuarios?role=agente&provider=local&active=false&temporary=true&expired=true&q=Ana&page=2&pageSize=10',
    );
    const r = http.expectOne((r) => r.url === '/api/users');
    expect(r.request.params.get('role')).toBe('agente');
    expect(r.request.params.get('active')).toBe('false');
    expect(r.request.params.get('page')).toBe('2');
    r.flush({ data: [cuentaPrueba()], total: 31, page: 2, pageSize: 10 });
    pagina.detectChanges();
    expect(componente.busqueda.value).toBe('Ana');
    expect(componente.temporales.value).toBe(true);
    componente.pagina(3);
    await pagina.fixture.whenStable();
    const siguiente = http.expectOne((r) => r.url === '/api/users');
    expect(siguiente.request.params.get('page')).toBe('3');
    expect(TestBed.inject(Router).url).toContain('role=agente');
    expect(TestBed.inject(Router).url).toContain('page=3');
    siguiente.flush({ data: [], total: 0, page: 3, pageSize: 10 });
  });
  it('espera 300 ms al buscar y actualiza la URL reiniciando la página', async () => {
    await abrir('/usuarios?page=2');
    lista([cuentaPrueba()], 50);
    componente.busqueda.setValue('ana');
    http.expectNone((r) => r.url === '/api/users');
    await new Promise((resolve) => setTimeout(resolve, 350));
    await pagina.fixture.whenStable();
    const r = http.expectOne((r) => r.url === '/api/users');
    expect(r.request.params.get('q')).toBe('ana');
    expect(r.request.params.get('page')).toBe('1');
    expect(TestBed.inject(Router).url).toContain('q=ana');
    r.flush({ data: [], total: 0, page: 1, pageSize: 20 });
  });
  it('solo ofrece restablecer en locales y desbloquear en bloqueadas', async () => {
    await abrir();
    lista();
    expect(
      componente.acciones(cuentaPrueba({ authProvider: 'directory' })).map((a) => a.codigo),
    ).not.toContain('restablecer');
    expect(componente.acciones(cuentaPrueba()).map((a) => a.codigo)).not.toContain('desbloquear');
    expect(
      componente
        .acciones(cuentaPrueba({ lockedUntil: new Date(Date.now() + 60000).toISOString() }))
        .map((a) => a.codigo),
    ).toContain('desbloquear');
  });
  it('protege la fila propia con explicaciones visibles y el rol deshabilitado', async () => {
    await abrir();
    const propia = cuentaPrueba({ id: usuarioPrueba.id, roleCode: 'administrador' });
    lista([propia]);
    const acciones = componente.acciones(propia);
    for (const codigo of ['desactivar', 'restablecer']) {
      const accion = acciones.find((a) => a.codigo === codigo)!;
      expect(accion.deshabilitada).toBe(true);
      expect(accion.explicacion).toBeTruthy();
    }
    componente.elegir(propia, 'desactivar');
    expect(componente.pendiente()).toBeNull();
    componente.elegir(propia, 'editar');
    await pagina.fixture.whenStable();
    expect(
      pagina.routeNativeElement!.querySelector<HTMLSelectElement>('select[id="usuario-rol"]')!
        .disabled,
    ).toBe(true);
    expect(pagina.routeNativeElement!.textContent).toContain('No puedes cambiar tu propio rol');
  });
  it.each(['restablecer', 'desbloquear', 'desactivar', 'reactivar'])(
    'confirma %s y muestra el error del servidor',
    async (accion) => {
      await abrir();
      const cuenta = cuentaPrueba({ isActive: accion !== 'reactivar' });
      lista([cuenta]);
      componente.elegir(cuenta, accion);
      expect(componente.pendiente()).not.toBeNull();
      http.expectNone((r) => r.method === 'POST');
      componente.ejecutar();
      const rutas: Record<string, string> = {
        restablecer: 'reset-password',
        desbloquear: 'unlock',
        desactivar: 'deactivate',
        reactivar: 'reactivate',
      };
      http
        .expectOne(`/api/users/25/${rutas[accion]}`)
        .flush(
          { error: { code: 'LAST_ADMINISTRATOR', message: 'Motivo concreto del servidor' } },
          { status: 409, statusText: 'Conflict' },
        );
      await pagina.fixture.whenStable();
      expect(pagina.routeNativeElement!.textContent).toContain('Motivo concreto del servidor');
      expect(componente.pendiente()).not.toBeNull();
    },
  );
  it('transfiere la clave una sola vez, la elimina de la respuesta y la retira al cerrar', async () => {
    await abrir();
    lista();
    const clave = crypto.randomUUID();
    const respuesta: CuentaConClave = { ...cuentaPrueba(), temporaryPassword: clave };
    componente.guardado(respuesta);
    lista();
    await pagina.fixture.whenStable();
    expect(respuesta.temporaryPassword).toBeUndefined();
    expect(pagina.routeNativeElement!.textContent).toContain(clave);
    expect(TestBed.inject(Router).url).not.toContain(clave);
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    Array.from(pagina.routeNativeElement!.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Ya la copié y entregué'))!
      .click();
    await pagina.fixture.whenStable();
    expect(pagina.routeNativeElement!.querySelector('app-clave-temporal')).toBeNull();
    expect(pagina.routeNativeElement!.textContent).not.toContain(clave);
    componente.nuevo();
    await pagina.fixture.whenStable();
    expect(pagina.routeNativeElement!.textContent).not.toContain(clave);
  });
  it('normaliza filtros inválidos sin enviarlos a la API', () => {
    expect(
      leerFiltros(
        convertToParamMap({
          page: '-1',
          pageSize: '9999',
          role: 'auditor',
          active: 'yes',
          provider: 'otro',
        }),
      ),
    ).toMatchObject({
      page: 1,
      pageSize: 20,
      role: undefined,
      active: undefined,
      provider: undefined,
    });
  });
});

describe('Formulario de usuario', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  function crear(cuenta: ReturnType<typeof cuentaPrueba> | null = null) {
    const f = TestBed.createComponent(FormularioUsuario);
    f.componentRef.setInput('cuenta', cuenta);
    f.detectChanges();
    return f;
  }
  it('valida nombre y correo y rechaza fecha pasada', () => {
    const f = crear();
    f.componentInstance.enviar();
    http.expectNone('/api/users');
    f.componentInstance.formulario.patchValue({ fullName: 'Persona', email: 'incorrecto' });
    f.componentInstance.enviar();
    expect(f.componentInstance.campo('email')).toContain('válido');
    f.componentInstance.formulario.patchValue({
      email: 'persona@helpdesk.local',
      temporary: true,
      expiresAt: '2020-01-01T12:00',
    });
    f.componentInstance.enviar();
    expect(f.componentInstance.errores()['expiresAt']).toContain('futuras');
    http.expectNone('/api/users');
  });
  it('temporal obliga a local y sin fecha delega el plazo al servidor', () => {
    const f = crear();
    const c = f.componentInstance;
    c.formulario.patchValue({
      fullName: 'Auditoría',
      email: 'auditoria@helpdesk.local',
      authProvider: 'directory',
    });
    c.formulario.controls.temporary.setValue(true);
    f.detectChanges();
    expect(c.formulario.controls.authProvider.value).toBe('local');
    expect(c.formulario.controls.authProvider.disabled).toBe(true);
    expect(f.nativeElement.textContent).toContain('duración estándar');
    c.enviar();
    const r = http.expectOne('/api/users');
    expect(r.request.body).toMatchObject({ authProvider: 'local', temporary: true });
    expect(r.request.body.expiresAt).toBeUndefined();
    r.flush(cuentaPrueba({ temporary: true }));
  });
  it('el alta local valida y muestra un correo duplicado en su campo', () => {
    const f = crear();
    escribir(f.nativeElement, 'usuario-nombre', ' Persona ');
    escribir(f.nativeElement, 'usuario-correo', ' persona@helpdesk.local ');
    f.componentInstance.enviar();
    const r = http.expectOne('/api/users');
    expect(r.request.body.fullName).toBe('Persona');
    r.flush(
      { error: { code: 'EMAIL_EXISTS', message: 'Ese correo ya está registrado' } },
      { status: 409, statusText: 'Conflict' },
    );
    f.detectChanges();
    expect(f.componentInstance.campo('email')).toContain('Ese correo ya está registrado');
    expect(f.nativeElement.querySelector('[id="usuario-correo-error"]')).not.toBeNull();
  });
  it('editar conserva proveedor y correo y exige confirmar cambios sensibles', () => {
    const f = crear(cuentaPrueba());
    f.componentInstance.formulario.patchValue({ roleCode: 'supervisor' });
    f.componentInstance.enviar();
    expect(f.componentInstance.confirmando()).toBe(true);
    http.expectNone('/api/users/25');
    f.componentInstance.enviar(true);
    const r = http.expectOne('/api/users/25');
    expect(r.request.body).toEqual({ roleCode: 'supervisor' });
    r.flush(cuentaPrueba({ roleCode: 'supervisor' }));
  });
  it('no elimina vencimiento obligatorio y no reenvía fechas vencidas sin cambios', () => {
    const f = crear(
      cuentaPrueba({
        expiresAt: '2020-01-01T12:00:00Z',
        expirationRequired: true,
        temporary: true,
      }),
    );
    f.componentInstance.formulario.controls.expiresAt.setValue('');
    f.componentInstance.enviar();
    expect(f.componentInstance.errores()['expiresAt']).toContain('conservar');
    f.componentInstance.formulario.controls.expiresAt.setValue(
      fechaParaCampo('2020-01-01T12:00:00Z'),
    );
    f.componentInstance.formulario.controls.fullName.setValue('Nombre nuevo');
    f.componentInstance.enviar();
    const r = http.expectOne('/api/users/25');
    expect(r.request.body).toEqual({ fullName: 'Nombre nuevo' });
    r.flush(cuentaPrueba());
  });
});
