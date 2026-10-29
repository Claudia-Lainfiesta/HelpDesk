import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('muestra HelpDesk y confirma la conexión con la API', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const request = http.expectOne('/api/health');
    expect(request.request.method).toBe('GET');
    request.flush({ status: 'ok', service: 'helpdesk-api', time: '2026-10-29T12:00:00Z' });
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('h1')?.textContent).toBe('HelpDesk');
    expect(page.querySelector('[role="status"]')?.textContent).toContain('API conectada');
  });

  it('permite reintentar después de un error de conexión', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    http.expectOne('/api/health').flush({}, { status: 503, statusText: 'Service Unavailable' });
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    expect(page.textContent).toContain('API no disponible');
    const button = page.querySelector('button') as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    button.click();
    http.expectOne('/api/health').flush({
      status: 'ok', service: 'helpdesk-api', time: '2026-10-29T12:00:00Z',
    });
    await fixture.whenStable();
    expect(page.textContent).toContain('API conectada');
  });
});
