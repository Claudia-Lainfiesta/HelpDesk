import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Modal } from './modal';
import { MenuAcciones } from './menu-acciones';
import { Confirmacion } from './confirmacion';
import { ClaveTemporal } from './clave-temporal';
import { Selector } from './selector';
import { AreaTexto } from './area-texto';
import { CampoFecha } from './campo-fecha';
import { Interruptor } from './interruptor';
import { Paginador } from './paginador';
import { Avisos } from './aviso-flotante';

@Component({
  selector: 'app-prueba-controles',
  standalone: true,
  imports: [ReactiveFormsModule, Selector, AreaTexto, CampoFecha, Interruptor],
  template: `<app-selector
      identificador="rol"
      etiqueta="Rol"
      [opciones]="[
        { valor: 'agente', etiqueta: 'Agente' },
        { valor: 'supervisor', etiqueta: 'Supervisor' },
      ]"
      [formControl]="texto"
      ayuda="Elige un rol"
      error="Error de ejemplo"
    /><app-area-texto identificador="nota" etiqueta="Nota" [formControl]="nota" /><app-campo-fecha
      identificador="fecha"
      etiqueta="Fecha"
      [formControl]="fecha"
    /><app-interruptor identificador="temporal" etiqueta="Temporal" [formControl]="temporal" />`,
})
class PruebaControles {
  texto = new FormControl('agente');
  nota = new FormControl('');
  fecha = new FormControl('');
  temporal = new FormControl(false);
}

describe('Diálogos y controles administrativos', () => {
  afterEach(() => vi.restoreAllMocks());
  it('el modal enfoca, atrapa Tab, permite Escape y devuelve el foco', async () => {
    const abrir = document.createElement('button');
    document.body.append(abrir);
    abrir.focus();
    const previo = document.body.style.overflow;
    const fixture = TestBed.createComponent(Modal);
    fixture.componentRef.setInput('titulo', 'Prueba');
    const cerrar = vi.fn();
    fixture.componentInstance.cerrar.subscribe(cerrar);
    fixture.detectChanges();
    await fixture.whenStable();
    const dialogo = fixture.nativeElement.querySelector('[role="dialog"]');
    const boton = fixture.nativeElement.querySelector('button');
    expect(dialogo.getAttribute('aria-labelledby')).toBe(fixture.componentInstance.tituloId);
    expect(document.activeElement).toBe(boton);
    expect(document.body.style.overflow).toBe('hidden');
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    document.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(boton);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(cerrar).toHaveBeenCalledOnce();
    fixture.destroy();
    expect(document.activeElement).toBe(abrir);
    expect(document.body.style.overflow).toBe(previo);
    abrir.remove();
  });
  it('el modal ocupado impide cierres y el diálogo de clave no ofrece Escape', async () => {
    const f = TestBed.createComponent(Modal);
    f.componentRef.setInput('titulo', 'Ocupado');
    f.componentRef.setInput('ocupado', true);
    const cerrar = vi.fn();
    f.componentInstance.cerrar.subscribe(cerrar);
    f.detectChanges();
    await f.whenStable();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(cerrar).not.toHaveBeenCalled();
    f.componentRef.setInput('permiteCerrar', false);
    f.detectChanges();
    expect(f.nativeElement.querySelector('button')).toBeNull();
  });
  it('el menú recorre acciones habilitadas con flechas, Home, End y Escape', async () => {
    const f = TestBed.createComponent(MenuAcciones);
    f.componentRef.setInput('nombre', 'Persona');
    f.componentRef.setInput('acciones', [
      { codigo: 'editar', etiqueta: 'Editar' },
      {
        codigo: 'no',
        etiqueta: 'No permitido',
        deshabilitada: true,
        explicacion: 'Motivo visible',
      },
      { codigo: 'activar', etiqueta: 'Activar' },
    ]);
    f.detectChanges();
    const abrir = f.nativeElement.querySelector('button');
    abrir.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }),
    );
    await f.whenStable();
    const botones = f.nativeElement.querySelectorAll('[role="menuitem"]');
    expect(document.activeElement).toBe(botones[0]);
    expect(botones[1].disabled).toBe(true);
    botones[0].dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }),
    );
    expect(document.activeElement).toBe(botones[2]);
    botones[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(document.activeElement).toBe(botones[0]);
    botones[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(document.activeElement).toBe(botones[2]);
    botones[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await f.whenStable();
    expect(document.activeElement).toBe(abrir);
    expect(abrir.getAttribute('aria-expanded')).toBe('false');
    abrir.click();
    await f.whenStable();
    const elegir = vi.fn();
    f.componentInstance.seleccionado.subscribe(elegir);
    f.nativeElement.querySelector('[role="menuitem"]').click();
    expect(elegir).toHaveBeenCalledWith('editar');
  });
  it('confirmación emite confirmar y cancelar y respeta cargando', async () => {
    const f = TestBed.createComponent(Confirmacion);
    f.componentRef.setInput('titulo', 'Desactivar');
    f.componentRef.setInput('mensaje', '¿Continuar?');
    f.componentRef.setInput('peligro', true);
    const si = vi.fn(),
      no = vi.fn();
    f.componentInstance.confirmar.subscribe(si);
    f.componentInstance.cancelar.subscribe(no);
    f.detectChanges();
    await f.whenStable();
    const botones = f.nativeElement.querySelectorAll('app-boton button');
    botones[0].click();
    botones[1].click();
    expect(no).toHaveBeenCalledOnce();
    expect(si).toHaveBeenCalledOnce();
    expect(botones[1].className).toContain('bg-peligro');
    f.componentRef.setInput('cargando', true);
    f.detectChanges();
    expect(botones[1].disabled).toBe(true);
  });
  it('los controles nuevos implementan formularios reactivos y asociaciones accesibles', () => {
    const f = TestBed.createComponent(PruebaControles);
    f.detectChanges();
    const e = f.nativeElement as HTMLElement;
    expect(e.querySelector('select')?.getAttribute('aria-describedby')).toBe('rol-ayuda rol-error');
    f.componentInstance.texto.setValue('supervisor');
    f.detectChanges();
    expect(e.querySelector('select')?.value).toBe('supervisor');
    const nota = e.querySelector('textarea')!;
    nota.value = 'Comentario';
    nota.dispatchEvent(new Event('input'));
    expect(f.componentInstance.nota.value).toBe('Comentario');
    const fecha = e.querySelector<HTMLInputElement>('input[type="datetime-local"]')!;
    fecha.value = '2099-01-01T12:00';
    fecha.dispatchEvent(new Event('input'));
    expect(f.componentInstance.fecha.value).toBe('2099-01-01T12:00');
    const interruptor = e.querySelector<HTMLInputElement>('[role="switch"]')!;
    interruptor.click();
    expect(f.componentInstance.temporal.value).toBe(true);
    f.componentInstance.nota.disable();
    f.detectChanges();
    expect(nota.disabled).toBe(true);
  });
  it('la clave solo se copia por acción explícita y se elimina al cerrar y destruir', async () => {
    const anterior = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    const copiar = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: copiar },
      configurable: true,
    });
    try {
      const f = TestBed.createComponent(ClaveTemporal);
      const clave = crypto.randomUUID();
      const cerrar = vi.fn();
      f.componentInstance.cerrar.subscribe(cerrar);
      f.componentInstance.entregar(clave);
      f.detectChanges();
      await f.whenStable();
      expect(f.nativeElement.textContent).toContain(clave);
      expect(f.nativeElement.querySelector('[aria-label="Cerrar diálogo"]')).toBeNull();
      expect(copiar).not.toHaveBeenCalled();
      await f.componentInstance.copiar();
      f.detectChanges();
      expect(copiar).toHaveBeenCalledWith(clave);
      expect(f.componentInstance.mensaje()).toContain('copiada');
      expect(f.nativeElement.textContent).toContain('Contraseña copiada.');
      f.componentInstance.terminar();
      f.detectChanges();
      expect(f.componentInstance.clave).toBe('');
      expect(f.nativeElement.textContent).not.toContain(clave);
      expect(cerrar).toHaveBeenCalledOnce();
      expect(localStorage.length).toBe(0);
      expect(sessionStorage.length).toBe(0);
      expect(location.href).not.toContain(clave);
      f.destroy();
      expect(f.componentInstance.clave).toBe('');
    } finally {
      if (anterior) Object.defineProperty(navigator, 'clipboard', anterior);
      else Reflect.deleteProperty(navigator, 'clipboard');
    }
  });
  it('avisa cuando no puede usar el portapapeles', async () => {
    const f = TestBed.createComponent(ClaveTemporal);
    f.componentInstance.entregar(crypto.randomUUID());
    f.detectChanges();
    await f.whenStable();
    await f.componentInstance.copiar();
    expect(f.componentInstance.mensaje()).toContain('manualmente');
  });
  it('el paginador muestra el rango y limita anterior y siguiente', () => {
    const f = TestBed.createComponent(Paginador);
    f.componentRef.setInput('total', 23);
    f.componentRef.setInput('pagina', 2);
    f.componentRef.setInput('tamano', 20);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Mostrando 21–23 de 23');
    expect(f.nativeElement.querySelector('select').value).toBe('20');
    expect(f.nativeElement.querySelectorAll('app-boton button')[1].disabled).toBe(true);
  });
  it('los avisos desaparecen automáticamente', () => {
    vi.useFakeTimers();
    try {
      const avisos = TestBed.inject(Avisos);
      avisos.mostrar('Guardado');
      expect(avisos.aviso()?.mensaje).toBe('Guardado');
      vi.advanceTimersByTime(6000);
      expect(avisos.aviso()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
