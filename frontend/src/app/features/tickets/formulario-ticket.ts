import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { TicketsApi, Ticket } from '../../core/tickets/tickets-api';
import { CategoriasApi } from '../../core/administracion/categorias-api';
import { Categoria } from '../../core/administracion/modelos';
import { interpretarError } from '../../core/auth/fallo-api';
import { Modal } from '../../shared/ui/modal';
import { Boton } from '../../shared/ui/boton';
import { CampoTexto } from '../../shared/ui/campo-texto';
import { Selector } from '../../shared/ui/selector';
import { AreaTexto } from '../../shared/ui/area-texto';
import { Alerta } from '../../shared/ui/alerta';
@Component({
  selector: 'app-formulario-ticket',
  standalone: true,
  imports: [ReactiveFormsModule, Modal, Boton, CampoTexto, Selector, AreaTexto, Alerta],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <app-modal titulo="Nuevo ticket" [ocupado]="enviando()" (cerrar)="cerrar.emit()">
    <form [formGroup]="formulario" (ngSubmit)="enviar()" class="space-y-5" novalidate>
      @if (error()) {
        <app-alerta variante="peligro">{{ error() }}</app-alerta>
      }
      <app-campo-texto
        identificador="ticket-asunto"
        etiqueta="Asunto"
        formControlName="subject"
        [error]="campo('subject')"
        ayuda="Hasta 160 caracteres."
      />
      <app-selector
        identificador="ticket-categoria"
        etiqueta="Categoría"
        formControlName="categoryId"
        [opciones]="opciones()"
        [error]="campo('categoryId')"
      />
      @if (errorCategorias()) {
        <app-alerta variante="peligro">{{ errorCategorias() }}</app-alerta
        ><app-boton variante="secundario" (accion)="cargarCategorias()"
          >Reintentar categorías</app-boton
        >
      }
      <app-area-texto
        identificador="ticket-descripcion"
        etiqueta="Descripción"
        formControlName="description"
        [maximo]="5000"
        [error]="campo('description')"
        ayuda="Describe tu solicitud, hasta 5000 caracteres. No incluyas contraseñas."
      />
      <div class="flex justify-end gap-3">
        <app-boton variante="secundario" [deshabilitado]="enviando()" (accion)="cerrar.emit()"
          >Cancelar</app-boton
        ><app-boton
          tipo="submit"
          [cargando]="enviando()"
          [deshabilitado]="cargandoCategorias() || !!errorCategorias()"
          >Crear ticket</app-boton
        >
      </div>
    </form></app-modal
  >`,
})
export class FormularioTicket {
  private readonly api = inject(TicketsApi);
  private readonly categoriasApi = inject(CategoriasApi);
  private readonly destruir = inject(DestroyRef);
  readonly cerrar = output<void>();
  readonly creado = output<Ticket>();
  readonly enviando = signal(false);
  readonly error = signal('');
  readonly errorCategorias = signal('');
  readonly cargandoCategorias = signal(true);
  readonly categorias = signal<Categoria[]>([]);
  readonly formulario = inject(FormBuilder).nonNullable.group({
    subject: ['', [Validators.required, Validators.maxLength(160), Validators.pattern(/\S/)]],
    categoryId: ['', Validators.required],
    description: ['', [Validators.required, Validators.maxLength(5000), Validators.pattern(/\S/)]],
  });
  constructor() {
    this.cargarCategorias();
  }
  opciones() {
    return [
      {
        valor: '',
        etiqueta: this.cargandoCategorias() ? 'Cargando categorías…' : 'Selecciona una categoría',
      },
      ...this.categorias()
        .filter((c) => c.isActive)
        .map((c) => ({ valor: c.id, etiqueta: c.name })),
    ];
  }
  cargarCategorias() {
    this.cargandoCategorias.set(true);
    this.errorCategorias.set('');
    this.categoriasApi
      .listar()
      .pipe(
        takeUntilDestroyed(this.destruir),
        finalize(() => this.cargandoCategorias.set(false)),
      )
      .subscribe({
        next: (r) => this.categorias.set(r.data),
        error: (e) => this.errorCategorias.set(interpretarError(e).message),
      });
  }
  campo(nombre: keyof typeof this.formulario.controls) {
    const c = this.formulario.controls[nombre];
    return c.touched && c.invalid
      ? nombre === 'categoryId'
        ? 'Selecciona una categoría.'
        : nombre === 'subject'
          ? 'Escribe un asunto de 1 a 160 caracteres.'
          : 'Escribe una descripción de 1 a 5000 caracteres.'
      : '';
  }
  enviar() {
    if (this.enviando() || this.cargandoCategorias() || this.errorCategorias()) return;
    this.formulario.markAllAsTouched();
    if (this.formulario.invalid) return;
    const v = this.formulario.getRawValue();
    this.enviando.set(true);
    this.error.set('');
    this.api
      .crear({ ...v, subject: v.subject.trim(), description: v.description.trim() })
      .pipe(
        takeUntilDestroyed(this.destruir),
        finalize(() => this.enviando.set(false)),
      )
      .subscribe({
        next: (t) => this.creado.emit(t),
        error: (e) => {
          const f = interpretarError(e);
          this.error.set(f.message);
          if (f.codigo === 'CATEGORY_INACTIVE' || f.codigo === 'INVALID_CATEGORY') {
            this.error.set(
              'La categoría seleccionada ya no está disponible. Elige otra categoría.',
            );
            this.formulario.controls.categoryId.setValue('');
            this.cargarCategorias();
          }
        },
      });
  }
}
