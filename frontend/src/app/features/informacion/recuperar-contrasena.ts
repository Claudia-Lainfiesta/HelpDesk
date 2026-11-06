import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { Tarjeta } from '../../shared/ui/tarjeta';
import { Marca } from '../../shared/ui/marca';
import { CampoTexto } from '../../shared/ui/campo-texto';
import { Boton } from '../../shared/ui/boton';
import { Alerta } from '../../shared/ui/alerta';
import { RecuperacionApi } from '../../core/auth/recuperacion-api';
import { interpretarError } from '../../core/auth/fallo-api';
import { validarCorreo } from '../acceso/validadores';

@Component({
  selector: 'app-recuperar-contrasena',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, Tarjeta, Marca, CampoTexto, Boton, Alerta],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<main class="mx-auto max-w-xl px-6 py-16">
    <div class="mb-8"><app-marca /></div>
    <app-tarjeta
      ><div class="p-8">
        <h1>Recuperar contraseña</h1>
        <p class="mt-4 leading-relaxed text-texto-suave">
          Escribe tu correo para solicitar ayuda de administración. Esta solicitud no cambia tu
          contraseña ni modifica tu cuenta.
        </p>
        @if (exito()) {
          <app-alerta variante="exito" class="mt-5 block"
            >Solicitud recibida. Si el correo corresponde a una cuenta local habilitada,
            administración recibirá un aviso. Por seguridad no confirmamos si la cuenta
            existe.</app-alerta
          >
        }
        @if (error()) {
          <app-alerta variante="peligro" class="mt-5 block">{{ error() }}</app-alerta>
        }
        <form class="mt-6 space-y-5" [formGroup]="formulario" (ngSubmit)="solicitar()" novalidate>
          <app-campo-texto
            identificador="recuperacion-correo"
            etiqueta="Correo"
            tipo="email"
            autocompletar="username"
            icono="correo"
            marcador="nombre@empresa.com"
            formControlName="correo"
            [error]="
              formulario.controls.correo.touched && formulario.controls.correo.invalid
                ? 'Escribe un correo válido de hasta 254 caracteres.'
                : ''
            "
          />
          <app-boton tipo="submit" [anchoCompleto]="true" [cargando]="cargando()"
            >Solicitar recuperación</app-boton
          >
        </form>
        <p class="mt-5 text-sm leading-relaxed text-texto-suave">
          Si utilizas el acceso corporativo, la recuperación de esa contraseña se realiza mediante
          el directorio de la empresa.
        </p>
        <a
          routerLink="/iniciar-sesion"
          class="mt-6 inline-block rounded-boton font-semibold text-primario underline underline-offset-4"
          >Volver a iniciar sesión</a
        >
      </div></app-tarjeta
    >
  </main>`,
})
export class RecuperarContrasena {
  private readonly api = inject(RecuperacionApi);
  private readonly destruir = inject(DestroyRef);
  readonly cargando = signal(false);
  readonly exito = signal(false);
  readonly error = signal('');
  readonly formulario = new FormGroup({
    correo: new FormControl('', { nonNullable: true, validators: [validarCorreo] }),
  });
  solicitar() {
    if (this.cargando()) return;
    this.formulario.markAllAsTouched();
    if (this.formulario.invalid) return;
    this.exito.set(false);
    this.error.set('');
    this.cargando.set(true);
    this.api
      .solicitar(this.formulario.controls.correo.value)
      .pipe(
        takeUntilDestroyed(this.destruir),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe({
        next: () => {
          this.formulario.reset({ correo: '' });
          this.exito.set(true);
        },
        error: (error: unknown) => {
          const fallo = interpretarError(error);
          this.error.set(
            fallo.estado === 429
              ? 'Has realizado demasiadas solicitudes. Intenta más tarde.'
              : fallo.message,
          );
        },
      });
  }
}
