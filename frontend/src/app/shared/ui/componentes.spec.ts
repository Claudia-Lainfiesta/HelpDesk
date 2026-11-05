import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Boton } from './boton';
import { CampoTexto } from './campo-texto';
import { InsigniaEstado, estados } from './insignia-estado';
import { Icono } from './icono';
import { Alerta } from './alerta';
import { Filtro } from './filtro';
import { Tarjeta } from './tarjeta';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, CampoTexto],
  template: `<app-campo-texto
    identificador="campo-prueba"
    etiqueta="Correo"
    icono="correo"
    ayuda="Correo de la empresa"
    error="Correo inválido"
    [formControl]="control"
  />`,
})
class CampoPrueba {
  readonly control = new FormControl('', { nonNullable: true });
}

describe('Componentes de interfaz', () => {
  it.each(['primario', 'secundario', 'peligro', 'fantasma'])(
    'botón %s con tipo explícito y radio etiquetado',
    (variante) => {
      const fixture = TestBed.createComponent(Boton);
      fixture.componentRef.setInput('variante', variante);
      fixture.detectChanges();
      const boton = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
      expect(boton.type).toBe('button');
      expect(boton.classList.contains('rounded-boton')).toBe(true);
      expect(boton.className).toContain(
        variante === 'fantasma'
          ? 'bg-transparent'
          : variante === 'secundario'
            ? 'bg-superficie'
            : `bg-${variante}`,
      );
    },
  );
  it('un botón cargando queda deshabilitado y no emite otro envío', () => {
    const fixture = TestBed.createComponent(Boton);
    const accion = vi.fn();
    fixture.componentInstance.accion.subscribe(accion);
    fixture.componentRef.setInput('cargando', true);
    fixture.detectChanges();
    const boton = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
    expect(boton.getAttribute('aria-busy')).toBe('true');
    boton.click();
    expect(accion).not.toHaveBeenCalled();
    expect(boton.textContent).toContain('Procesando');
  });
  it('campo enlaza etiqueta, ayuda y error; propaga valor y deshabilitado al formulario reactivo', () => {
    const fixture = TestBed.createComponent(CampoPrueba);
    fixture.detectChanges();
    const pagina = fixture.nativeElement as HTMLElement;
    const campo = pagina.querySelector('input')!;
    expect(pagina.querySelector('label')?.htmlFor).toBe(campo.id);
    expect(pagina.querySelectorAll('[id="campo-prueba"]')).toHaveLength(1);
    expect(campo.getAttribute('aria-describedby')).toBe('campo-prueba-ayuda campo-prueba-error');
    expect(campo.getAttribute('aria-invalid')).toBe('true');
    campo.value = 'ana@empresa.com';
    campo.dispatchEvent(new Event('input'));
    campo.dispatchEvent(new Event('blur'));
    expect(fixture.componentInstance.control.value).toBe('ana@empresa.com');
    expect(fixture.componentInstance.control.touched).toBe(true);
    fixture.componentInstance.control.disable();
    fixture.detectChanges();
    expect(campo.disabled).toBe(true);
    fixture.componentInstance.control.enable();
    fixture.componentInstance.control.setValue('otro@empresa.com');
    fixture.detectChanges();
    expect(campo.value).toBe('otro@empresa.com');
  });
  it.each(Object.entries(estados))(
    'insignia %s comunica el estado con texto y punto',
    (codigo, estado) => {
      const fixture = TestBed.createComponent(InsigniaEstado);
      fixture.componentRef.setInput('codigo', codigo);
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain(estado.etiqueta);
      expect(fixture.nativeElement.querySelector('[aria-hidden="true"]')).not.toBeNull();
      for (const clase of estado.clases.split(' '))
        expect(fixture.nativeElement.querySelector('span').classList.contains(clase)).toBe(true);
    },
  );
  it('icono decorativo se oculta y el icono solo tiene nombre accesible', () => {
    const fixture = TestBed.createComponent(Icono);
    fixture.componentRef.setInput('nombre', 'ticket');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('svg').getAttribute('aria-hidden')).toBe('true');
    fixture.componentRef.setInput('etiqueta', 'Ticket');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('svg').getAttribute('aria-label')).toBe('Ticket');
  });
  it('filtro expone su selección y emite al activarse', () => {
    const fixture = TestBed.createComponent(Filtro);
    const seleccionar = vi.fn();
    fixture.componentInstance.seleccionado.subscribe(seleccionar);
    fixture.componentRef.setInput('activo', true);
    fixture.detectChanges();
    const boton = fixture.nativeElement.querySelector('button');
    expect(boton.getAttribute('aria-pressed')).toBe('true');
    boton.click();
    expect(seleccionar).toHaveBeenCalledOnce();
  });
  it.each(['exito', 'aviso', 'peligro', 'info'])(
    'alerta %s tiene semántica accesible',
    (variante) => {
      const fixture = TestBed.createComponent(Alerta);
      fixture.componentRef.setInput('variante', variante);
      fixture.detectChanges();
      expect(fixture.nativeElement.firstElementChild.getAttribute('role')).toBe(
        variante === 'peligro' ? 'alert' : 'status',
      );
    },
  );
  it('tarjeta usa superficie, borde, radio y sombra semánticos', () => {
    const fixture = TestBed.createComponent(Tarjeta);
    fixture.detectChanges();
    expect(fixture.nativeElement.className).toContain('bg-superficie');
    expect(fixture.nativeElement.className).toContain('rounded-tarjeta');
    expect(fixture.nativeElement.className).toContain('shadow-tarjeta');
  });
});
