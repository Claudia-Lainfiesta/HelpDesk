import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Categorias } from './categorias';
import { FormularioCategoria } from './formulario-categoria';
import { categoriaPrueba } from '../../pruebas/administracion';

describe('Categorías', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('carga activas, muestra vacío y permite incluir inactivas', async () => {
    const f = TestBed.createComponent(Categorias);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Cargando categorías');
    http.expectOne('/api/categories?includeInactive=false').flush({ data: [] });
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('No hay categorías');
    f.componentInstance.inactivas.setValue(true);
    http
      .expectOne('/api/categories?includeInactive=true')
      .flush({ data: [categoriaPrueba({ isActive: false })] });
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('Inactiva');
  });
  it('muestra errores y permite reintentar', async () => {
    const f = TestBed.createComponent(Categorias);
    f.detectChanges();
    http
      .expectOne('/api/categories?includeInactive=false')
      .flush(
        { error: { code: 'ERROR_API', message: 'Error temporal' } },
        { status: 503, statusText: 'Unavailable' },
      );
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('Error temporal');
    Array.from(f.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find((b) => b.textContent?.includes('Reintentar'))!
      .click();
    http.expectOne('/api/categories?includeInactive=false').flush({ data: [categoriaPrueba()] });
    await f.whenStable();
    expect(f.nativeElement.textContent).toContain('Categoría de prueba');
  });
  it.each([true, false])(
    'confirma el cambio de activa=%s, conserva tickets y recarga',
    async (isActive) => {
      const f = TestBed.createComponent(Categorias);
      f.detectChanges();
      http
        .expectOne('/api/categories?includeInactive=false')
        .flush({ data: [categoriaPrueba({ isActive })] });
      f.componentInstance.elegir(categoriaPrueba({ isActive }), 'activar');
      await f.whenStable();
      expect(f.nativeElement.querySelector('[role="dialog"]')).not.toBeNull();
      if (isActive)
        expect(f.nativeElement.textContent).toContain('los tickets existentes la conservan');
      http.expectNone('/api/categories/8');
      f.componentInstance.confirmar();
      const r = http.expectOne('/api/categories/8');
      expect(r.request.body).toEqual({ isActive: !isActive });
      r.flush(categoriaPrueba({ isActive: !isActive }));
      http.expectOne('/api/categories?includeInactive=false').flush({ data: [] });
      await f.whenStable();
      expect(f.componentInstance.pendiente()).toBeNull();
    },
  );
  it('el alta valida nombre y longitud, envía JSON y emite el resultado', () => {
    const f = TestBed.createComponent(FormularioCategoria);
    f.detectChanges();
    const guardar = vi.fn();
    f.componentInstance.guardado.subscribe(guardar);
    f.componentInstance.enviar();
    http.expectNone('/api/categories');
    f.componentInstance.formulario.controls.name.setValue('a'.repeat(81));
    f.componentInstance.enviar();
    http.expectNone('/api/categories');
    f.componentInstance.formulario.patchValue({
      name: ' Nueva categoría ',
      description: ' Ayuda ',
    });
    f.componentInstance.enviar();
    const r = http.expectOne('/api/categories');
    expect(r.request.body).toEqual({
      name: 'Nueva categoría',
      description: 'Ayuda',
      isActive: true,
    });
    r.flush(categoriaPrueba());
    expect(guardar).toHaveBeenCalledOnce();
  });
  it('un nombre duplicado muestra el mensaje de la API en el campo', () => {
    const f = TestBed.createComponent(FormularioCategoria);
    f.detectChanges();
    f.componentInstance.formulario.controls.name.setValue('Hardware');
    f.componentInstance.enviar();
    http.expectOne('/api/categories').flush(
      {
        error: { code: 'CATEGORY_EXISTS', message: 'Nombre duplicado sin distinguir mayúsculas' },
      },
      { status: 409, statusText: 'Conflict' },
    );
    f.detectChanges();
    expect(f.nativeElement.querySelector('[id="categoria-nombre-error"]').textContent).toContain(
      'Nombre duplicado',
    );
  });
  it('editar precarga los datos y confirma una desactivación antes de guardar', () => {
    const f = TestBed.createComponent(FormularioCategoria);
    f.componentRef.setInput('categoria', categoriaPrueba());
    f.detectChanges();
    expect(f.componentInstance.formulario.controls.name.value).toBe('Categoría de prueba');
    f.componentInstance.formulario.patchValue({ name: 'Nuevo nombre', isActive: false });
    f.componentInstance.enviar();
    expect(f.componentInstance.confirmando()).toBe(true);
    http.expectNone('/api/categories/8');
    f.componentInstance.enviar(true);
    const r = http.expectOne('/api/categories/8');
    expect(r.request.method).toBe('PATCH');
    expect(r.request.body.isActive).toBe(false);
    r.flush(categoriaPrueba({ isActive: false }));
  });
});
