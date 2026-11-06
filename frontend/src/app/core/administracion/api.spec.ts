import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UsuariosApi } from './usuarios-api';
import { CategoriasApi } from './categorias-api';
import { cuentaPrueba, categoriaPrueba } from '../../pruebas/administracion';
import { FechaLocal, fechaParaCampo } from './fechas';
import { errorAdministracion, erroresAdministracion } from './errores';
import { FalloApi } from '../auth/fallo-api';

describe('API administrativa', () => {
  let http: HttpTestingController;
  let usuarios: UsuariosApi;
  let categorias: CategoriasApi;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    usuarios = TestBed.inject(UsuariosApi);
    categorias = TestBed.inject(CategoriasApi);
  });
  afterEach(() => http.verify());
  it('serializa todos los filtros, incluidos false y la búsqueda literal', () => {
    usuarios
      .listar({
        page: 2,
        pageSize: 10,
        role: 'agente',
        active: false,
        provider: 'directory',
        temporary: false,
        expired: true,
        q: 'Ana %_',
      })
      .subscribe();
    const req = http.expectOne((r) => r.url === '/api/users');
    expect(
      Object.fromEntries(req.request.params.keys().map((k) => [k, req.request.params.get(k)])),
    ).toEqual({
      page: '2',
      pageSize: '10',
      role: 'agente',
      active: 'false',
      provider: 'directory',
      temporary: 'false',
      expired: 'true',
      q: 'Ana %_',
    });
    req.flush({ data: [], page: 2, pageSize: 10, total: 0 });
  });
  it('omite filtros sin valor', () => {
    usuarios.listar({ page: 1, pageSize: 20, q: '', role: undefined }).subscribe();
    const r = http.expectOne((r) => r.url === '/api/users');
    expect(r.request.params.keys()).toEqual(['page', 'pageSize']);
    r.flush({ data: [], total: 0, page: 1, pageSize: 20 });
  });
  it('consulta, crea y edita usando los campos reales', () => {
    usuarios.consultar('25').subscribe((v) => expect(v.id).toBe('25'));
    http.expectOne('/api/users/25').flush(cuentaPrueba());
    const datos = {
      fullName: 'Persona',
      email: 'persona@helpdesk.local',
      roleCode: 'agente' as const,
      temporary: true,
    };
    usuarios.crear(datos).subscribe();
    let r = http.expectOne('/api/users');
    expect(r.request.method).toBe('POST');
    expect(r.request.body).toEqual(datos);
    r.flush(cuentaPrueba());
    usuarios.editar('25', { notes: null, expiresAt: null }).subscribe();
    r = http.expectOne('/api/users/25');
    expect(r.request.method).toBe('PATCH');
    expect(r.request.body).toEqual({ notes: null, expiresAt: null });
    r.flush(cuentaPrueba());
  });
  it.each(['desactivar', 'reactivar', 'desbloquear', 'restablecerClave'] as const)(
    'envía JSON en %s',
    (metodo) => {
      const rutas = {
        desactivar: 'deactivate',
        reactivar: 'reactivate',
        desbloquear: 'unlock',
        restablecerClave: 'reset-password',
      };
      usuarios[metodo]('25').subscribe();
      const r = http.expectOne(`/api/users/25/${rutas[metodo]}`);
      expect(r.request.method).toBe('POST');
      expect(r.request.body).toEqual({});
      r.flush(cuentaPrueba());
    },
  );
  it.each([false, true])('lista categorías includeInactive=%s', (valor) => {
    categorias.listar(valor).subscribe();
    const r = http.expectOne(`/api/categories?includeInactive=${valor}`);
    r.flush({ data: [] });
  });
  it('crea y edita categorías', () => {
    categorias.crear({ name: 'Nueva', description: null, isActive: true }).subscribe();
    const alta = http.expectOne('/api/categories');
    expect(alta.request.method).toBe('POST');
    alta.flush(categoriaPrueba());
    categorias.editar('8', { isActive: false }).subscribe();
    const cambio = http.expectOne('/api/categories/8');
    expect(cambio.request.body).toEqual({ isActive: false });
    expect(cambio.request.method).toBe('PATCH');
    cambio.flush(categoriaPrueba({ isActive: false }));
  });
  it('centraliza los códigos y conserva mensajes de servidor no previstos', () => {
    for (const codigo of Object.keys(erroresAdministracion))
      expect(
        errorAdministracion(new FalloApi(409, codigo, 'Detalle específico del servidor')).mensaje,
      ).toContain('Detalle específico del servidor');
    expect(errorAdministracion(new FalloApi(400, 'NUEVO_CODIGO', 'Mensaje nuevo')).mensaje).toBe(
      'Mensaje nuevo',
    );
  });
  it('convierte fechas a la zona del navegador y muestra español', () => {
    const fecha = '2026-11-05T15:12:00Z';
    const local = fechaParaCampo(fecha);
    const esperado = new Date(fecha);
    expect(new Date(local).getHours()).toBe(esperado.getHours());
    expect(new FechaLocal().transform(fecha)).toContain('nov');
    expect(new FechaLocal().transform(null)).toBe('Sin registro');
  });
});
