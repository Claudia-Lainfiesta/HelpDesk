import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth/auth.service';
import { interpretarError } from '../../core/auth/fallo-api';
import { AppShell } from '../../layout/app-shell';
import { Boton } from '../../shared/ui/boton';
import { CampoTexto } from '../../shared/ui/campo-texto';
import { Alerta } from '../../shared/ui/alerta';
import { Marca } from '../../shared/ui/marca';
import { Tarjeta } from '../../shared/ui/tarjeta';
import { confirmarContrasena, politicaContrasena } from './validadores';

@Component({
  selector: 'app-cambiar-contrasena',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    ReactiveFormsModule,
    AppShell,
    Boton,
    CampoTexto,
    Alerta,
    Marca,
    Tarjeta,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cambiar-contrasena.html',
})
export class CambiarContrasena {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destruir = inject(DestroyRef);
  protected readonly obligatorio = computed(() => this.auth.usuario()?.mustChangePassword ?? false);
  protected readonly error = signal('');
  protected readonly formulario = inject(FormBuilder).nonNullable.group(
    {
      actual: ['', Validators.required],
      nueva: [
        '',
        [Validators.required, politicaContrasena(() => this.auth.usuario()?.email ?? '')],
      ],
      confirmacion: ['', Validators.required],
    },
    { validators: confirmarContrasena },
  );
  protected errorCampo(campo: 'actual' | 'nueva' | 'confirmacion') {
    const control = this.formulario.controls[campo];
    if (!control.touched) return '';
    if (control.hasError('required')) return 'Completa este campo.';
    if (campo === 'nueva' && control.invalid)
      return 'Usa entre 10 y 128 caracteres y una contraseña distinta del correo.';
    if (campo === 'nueva' && this.formulario.hasError('repetida'))
      return 'La nueva contraseña debe ser distinta de la actual.';
    return campo === 'confirmacion' && this.formulario.hasError('confirmacion')
      ? 'Las contraseñas no coinciden.'
      : '';
  }
  protected cambiar() {
    if (this.auth.cargando()) return;
    this.formulario.markAllAsTouched();
    if (this.formulario.invalid) return;
    this.error.set('');
    const { actual, nueva } = this.formulario.getRawValue();
    this.auth
      .cambiarContrasena(actual, nueva)
      .pipe(takeUntilDestroyed(this.destruir))
      .subscribe({
        next: () => {
          this.formulario.reset();
          void this.router.navigateByUrl('/tickets');
        },
        error: (error: unknown) => {
          this.formulario.reset();
          this.error.set(interpretarError(error).message);
        },
      });
  }
  protected salir() {
    this.auth
      .cerrarSesion()
      .pipe(takeUntilDestroyed(this.destruir))
      .subscribe({
        next: () => {
          this.formulario.reset();
          void this.router.navigateByUrl('/iniciar-sesion');
        },
        error: (error: unknown) => this.error.set(interpretarError(error).message),
      });
  }
}
