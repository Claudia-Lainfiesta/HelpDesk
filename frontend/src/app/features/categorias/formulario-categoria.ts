import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { CategoriasApi } from '../../core/administracion/categorias-api';
import { Categoria } from '../../core/administracion/modelos';
import { errorAdministracion } from '../../core/administracion/errores';
import { Modal } from '../../shared/ui/modal';
import { Boton } from '../../shared/ui/boton';
import { CampoTexto } from '../../shared/ui/campo-texto';
import { AreaTexto } from '../../shared/ui/area-texto';
import { Interruptor } from '../../shared/ui/interruptor';
import { Alerta } from '../../shared/ui/alerta';
@Component({
  selector: 'app-formulario-categoria',
  standalone: true,
  imports: [ReactiveFormsModule, Modal, Boton, CampoTexto, AreaTexto, Interruptor, Alerta],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-modal
    [titulo]="categoria() ? 'Editar categoría' : 'Nueva categoría'"
    [ocupado]="cargando()"
    (cerrar)="cerrar.emit()"
    ><form [formGroup]="formulario" (ngSubmit)="enviar()" class="space-y-5" novalidate>
      @if (error()) {
        <app-alerta variante="peligro">{{ error() }}</app-alerta>
      }
      <app-campo-texto
        identificador="categoria-nombre"
        etiqueta="Nombre"
        formControlName="name"
        [error]="
          errorNombre() ||
          (formulario.controls.name.touched && formulario.controls.name.invalid
            ? 'Escribe un nombre de 1 a 80 caracteres.'
            : '')
        "
      />
      <app-area-texto
        identificador="categoria-descripcion"
        etiqueta="Descripción"
        formControlName="description"
        [error]="
          formulario.controls.description.touched && formulario.controls.description.invalid
            ? 'La descripción admite hasta 2000 caracteres.'
            : ''
        "
      />
      <app-interruptor
        identificador="categoria-activa"
        etiqueta="Categoría activa"
        formControlName="isActive"
      />
      @if (!formulario.controls.isActive.value) {
        <p class="text-sm text-texto-suave">
          La categoría dejará de ofrecerse en tickets nuevos; los tickets existentes la conservan.
        </p>
      }
      @if (confirmando()) {
        <app-alerta variante="aviso"
          >{{
            formulario.controls.isActive.value
              ? 'La categoría volverá a ofrecerse en tickets nuevos.'
              : 'La categoría dejará de ofrecerse en tickets nuevos; los tickets existentes la conservan.'
          }}
          ¿Confirmas el cambio?</app-alerta
        >
        <div class="flex justify-end gap-3">
          <app-boton
            variante="secundario"
            [deshabilitado]="cargando()"
            (accion)="confirmando.set(false)"
            >Volver</app-boton
          ><app-boton
            [variante]="formulario.controls.isActive.value ? 'primario' : 'peligro'"
            [cargando]="cargando()"
            (accion)="enviar(true)"
            >Confirmar cambios</app-boton
          >
        </div>
      } @else {
        <div class="flex justify-end gap-3">
          <app-boton variante="secundario" [deshabilitado]="cargando()" (accion)="cerrar.emit()"
            >Cancelar</app-boton
          ><app-boton tipo="submit" [cargando]="cargando()">{{
            categoria() ? 'Guardar cambios' : 'Crear categoría'
          }}</app-boton>
        </div>
      }
    </form></app-modal
  >`,
})
export class FormularioCategoria implements OnInit {
  readonly categoria = input<Categoria | null>(null);
  readonly cerrar = output<void>();
  readonly guardado = output<Categoria>();
  private readonly api = inject(CategoriasApi);
  private readonly destruir = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  readonly cargando = signal(false);
  readonly error = signal('');
  readonly errorNombre = signal('');
  readonly confirmando = signal(false);
  readonly formulario = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(80), Validators.pattern(/\S/)]],
    description: ['', Validators.maxLength(2000)],
    isActive: [true],
  });
  ngOnInit() {
    const actual = this.categoria();
    if (actual) this.formulario.patchValue({ ...actual, description: actual.description ?? '' });
    this.formulario.valueChanges.pipe(takeUntilDestroyed(this.destruir)).subscribe(() => {
      this.errorNombre.set('');
      this.error.set('');
      this.confirmando.set(false);
    });
  }
  enviar(confirmado = false) {
    if (this.cargando()) return;
    this.formulario.markAllAsTouched();
    if (this.formulario.invalid) return;
    const valor = this.formulario.getRawValue();
    const actual = this.categoria();
    if (actual && actual.isActive !== valor.isActive && !confirmado) {
      this.confirmando.set(true);
      return;
    }
    const datos = {
      name: valor.name.trim(),
      description: valor.description.trim() || null,
      isActive: valor.isActive,
    };
    this.cargando.set(true);
    this.error.set('');
    (actual ? this.api.editar(actual.id, datos) : this.api.crear(datos))
      .pipe(
        takeUntilDestroyed(this.destruir),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe({
        next: (respuesta) => this.guardado.emit(respuesta),
        error: (error) => {
          const fallo = errorAdministracion(error);
          this.error.set(fallo.mensaje);
          if (fallo.campo === 'name') this.errorNombre.set(fallo.mensaje);
          this.confirmando.set(false);
        },
      });
  }
}
