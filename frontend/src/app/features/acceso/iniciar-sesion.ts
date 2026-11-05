import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth/auth.service';
import { interpretarError } from '../../core/auth/fallo-api';
import { rutaInterna } from '../../core/auth/ruta-interna';
import { Alerta } from '../../shared/ui/alerta';
import { Boton } from '../../shared/ui/boton';
import { CampoTexto } from '../../shared/ui/campo-texto';
import { Icono } from '../../shared/ui/icono';
import { Marca } from '../../shared/ui/marca';
import { validarCorreo } from './validadores';

@Component({
  selector: 'app-iniciar-sesion',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, Alerta, Boton, CampoTexto, Icono, Marca],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './iniciar-sesion.html',
})
export class IniciarSesion {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);
  private readonly destruir = inject(DestroyRef);
  protected readonly error = signal('');
  protected readonly formulario = inject(FormBuilder).nonNullable.group({
    correo: ['', validarCorreo],
    contrasena: ['', Validators.required],
  });
  protected errorCampo(campo: 'correo' | 'contrasena') {
    const control = this.formulario.controls[campo];
    return control.touched && control.invalid
      ? campo === 'correo'
        ? 'Escribe un correo válido.'
        : 'Escribe tu contraseña.'
      : '';
  }
  protected entrar() {
    if (this.auth.cargando()) return;
    this.formulario.markAllAsTouched();
    if (this.formulario.invalid) return;
    this.error.set('');
    const { correo, contrasena } = this.formulario.getRawValue();
    this.auth
      .iniciarSesion(correo, contrasena)
      .pipe(takeUntilDestroyed(this.destruir))
      .subscribe({
        next: (usuario) => {
          this.formulario.controls.contrasena.reset();
          void this.router.navigateByUrl(
            usuario.mustChangePassword
              ? '/cambiar-contrasena'
              : rutaInterna(this.ruta.snapshot.queryParamMap.get('returnUrl')),
          );
        },
        error: (error: unknown) => {
          this.formulario.controls.contrasena.reset();
          this.error.set(interpretarError(error).message);
        },
      });
  }
}
