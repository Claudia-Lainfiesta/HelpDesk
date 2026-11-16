import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FormularioTicket } from './formulario-ticket';
import { ImagenAdjunta } from './imagen-adjunta';
import { categoriaPrueba } from '../../pruebas/administracion';
const crearOriginal = URL.createObjectURL,
  revocarOriginal = URL.revokeObjectURL;
describe('imagen inicial del ticket', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    let index = 0;
    URL.createObjectURL = vi.fn(() => `blob:fixture-${++index}`);
    URL.revokeObjectURL = vi.fn();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
    URL.createObjectURL = crearOriginal;
    URL.revokeObjectURL = revocarOriginal;
  });
  function formulario() {
    const f = TestBed.createComponent(FormularioTicket);
    f.detectChanges();
    http.expectOne('/api/categories?includeInactive=false').flush({ data: [categoriaPrueba()] });
    f.componentInstance.formulario.setValue({
      subject: 'Asunto',
      description: 'Descripción',
      categoryId: '8',
    });
    f.detectChanges();
    return f;
  }
  function seleccionar(f: ReturnType<typeof formulario>, file: File) {
    const input = f.nativeElement.querySelector('#ticket-imagen') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    f.detectChanges();
    return input;
  }
  it('una imagen con preview; revoca al cambiar, quitar y destruir', () => {
    const f = formulario();
    const input = seleccionar(f, new File(['uno'], 'uno.png', { type: 'image/png' }));
    expect(input.accept).toBe('image/jpeg,image/png,image/webp');
    expect(input.multiple).toBe(false);
    expect(f.nativeElement.querySelector('img').getAttribute('src')).toBe('blob:fixture-1');
    seleccionar(f, new File(['dos'], 'dos.jpg', { type: 'image/jpeg' }));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fixture-1');
    f.componentInstance.quitarImagen();
    f.detectChanges();
    expect(f.nativeElement.querySelector('img')).toBeNull();
    expect(f.componentInstance.imagen()).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fixture-2');
    seleccionar(f, new File(['tres'], 'tres.webp', { type: 'image/webp' }));
    f.destroy();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fixture-3');
  });
  it.each(['image/gif', 'image/svg+xml', 'application/pdf', 'application/octet-stream'])(
    'rechaza MIME %s',
    (mime) => {
      const f = formulario();
      seleccionar(f, new File(['no imagen'], 'archivo', { type: mime }));
      expect(f.nativeElement.textContent).toContain(
        'Solo puedes adjuntar imágenes JPG, JPEG, PNG o WebP.',
      );
      expect(f.componentInstance.imagen()).toBeNull();
      expect(URL.createObjectURL).not.toHaveBeenCalled();
      f.componentInstance.enviar();
      http.expectNone('/api/tickets');
      f.componentInstance.quitarImagen();
      f.componentInstance.enviar();
      http.expectOne('/api/tickets').flush({ id: '1' });
    },
  );
  it('rechaza más de 10 MiB y acepta tamaño exacto', () => {
    const f = formulario();
    seleccionar(
      f,
      new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'exceso.png', { type: 'image/png' }),
    );
    expect(f.componentInstance.errorImagen()).toBe('La imagen no puede superar los 10 MB.');
    seleccionar(
      f,
      new File([new Uint8Array(10 * 1024 * 1024)], 'limite.png', { type: 'image/png' }),
    );
    expect(f.componentInstance.errorImagen()).toBe('');
    expect(f.componentInstance.imagen()?.size).toBe(10 * 1024 * 1024);
  });
  it('envía FormData, conserva texto/archivo ante error y limpia tras éxito', () => {
    const f = formulario();
    const image = new File(['fixture'], 'foto.png', { type: 'image/png' });
    seleccionar(f, image);
    f.componentInstance.enviar();
    let r = http.expectOne('/api/tickets');
    expect(r.request.body instanceof FormData).toBe(true);
    expect(r.request.body.get('image')).toBe(image);
    r.flush(
      { error: { code: 'INVALID_IMAGE', message: 'Imagen inválida.' } },
      { status: 400, statusText: 'Bad Request' },
    );
    expect(f.componentInstance.imagen()).toBe(image);
    expect(f.componentInstance.formulario.controls.subject.value).toBe('Asunto');
    expect(f.componentInstance.error()).toBe('Imagen inválida.');
    f.componentInstance.enviar();
    r = http.expectOne('/api/tickets');
    r.flush({ id: '1' });
    expect(f.componentInstance.imagen()).toBeNull();
    expect(f.componentInstance.formulario.controls.subject.value).toBe('');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fixture-1');
  });
  function detalle() {
    const f = TestBed.createComponent(ImagenAdjunta);
    f.componentRef.setInput('ticketId', '123');
    f.componentRef.setInput('numero', 'TK-000123');
    f.detectChanges();
    return f;
  }
  it('detalle carga Blob, alt y ampliación segura; libera ObjectURL', () => {
    const f = detalle();
    expect(f.nativeElement.textContent).toContain('Cargando imagen');
    const r = http.expectOne('/api/tickets/123/attachment');
    expect(r.request.responseType).toBe('blob');
    r.flush(new Blob(['fixture'], { type: 'image/png' }));
    f.detectChanges();
    expect(f.nativeElement.querySelector('img').alt).toBe('Imagen adjunta al ticket TK-000123');
    const link = f.nativeElement.querySelector('a');
    expect(link.getAttribute('href')).toBe('blob:fixture-1');
    expect(link.querySelector('img')).not.toBeNull();
    expect(link.getAttribute('aria-label')).toBe('Ver imagen adjunta en tamaño completo');
    expect(f.nativeElement.textContent).not.toContain('Ver imagen más grande');
    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noopener noreferrer');
    f.destroy();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fixture-1');
  });
  it('error aislado y reintento; fallo de decodificación libera Blob', () => {
    const f = detalle();
    http
      .expectOne('/api/tickets/123/attachment')
      .flush(new Blob(['No encontrada'], { type: 'application/json' }), {
        status: 404,
        statusText: 'Not Found',
      });
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('No fue posible cargar la imagen adjunta.');
    f.componentInstance.cargar();
    http.expectOne('/api/tickets/123/attachment').flush(new Blob(['roto'], { type: 'image/png' }));
    f.detectChanges();
    f.nativeElement.querySelector('img').dispatchEvent(new Event('error'));
    f.detectChanges();
    expect(f.componentInstance.url()).toBe('');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fixture-1');
  });
});
