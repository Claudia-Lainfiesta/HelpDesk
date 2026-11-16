import { TestBed } from '@angular/core/testing';
import { InsigniaPrioridad } from './insignia-prioridad';
import { prioridadesTicket, etiquetasPrioridad } from '../../core/tickets/prioridad';
it.each(prioridadesTicket)('muestra prioridad %s con etiqueta y tokens semánticos', (prioridad) => {
  const f = TestBed.createComponent(InsigniaPrioridad);
  f.componentRef.setInput('prioridad', prioridad);
  f.detectChanges();
  expect(f.nativeElement.textContent).toContain(etiquetasPrioridad[prioridad]);
  const esperado = {
    baja: 'text-info',
    media: 'text-texto-suave',
    alta: 'text-aviso',
    urgente: 'text-peligro',
  }[prioridad];
  expect(f.nativeElement.querySelector('span').classList.contains(esperado)).toBe(true);
  expect(f.nativeElement.querySelector('span').className).not.toMatch(/bg-|border|rounded/);
});
