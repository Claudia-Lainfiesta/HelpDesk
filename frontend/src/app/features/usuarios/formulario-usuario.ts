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
import { Modal } from '../../shared/ui/modal';
import { Boton } from '../../shared/ui/boton';
import { CampoTexto } from '../../shared/ui/campo-texto';
import { Selector } from '../../shared/ui/selector';
import { AreaTexto } from '../../shared/ui/area-texto';
import { CampoFecha } from '../../shared/ui/campo-fecha';
import { Interruptor } from '../../shared/ui/interruptor';
import { Alerta } from '../../shared/ui/alerta';
import {
  AltaCuenta,
  CambioCuenta,
  Cuenta,
  CuentaConClave,
  Proveedor,
  roles,
} from '../../core/administracion/modelos';
import { UsuariosApi } from '../../core/administracion/usuarios-api';
import { errorAdministracion } from '../../core/administracion/errores';
import { fechaFutura, fechaParaCampo } from '../../core/administracion/fechas';
import { validarCorreo } from '../acceso/validadores';
import { Rol } from '../../core/auth/modelos';

@Component({
  selector: 'app-formulario-usuario',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    Modal,
    Boton,
    CampoTexto,
    Selector,
    AreaTexto,
    CampoFecha,
    Interruptor,
    Alerta,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './formulario-usuario.html',
})
export class FormularioUsuario implements OnInit {
  readonly cuenta = input<Cuenta | null>(null);
  readonly propio = input(false);
  readonly cerrar = output<void>();
  readonly guardado = output<CuentaConClave>();
  readonly cargando = signal(false);
  readonly error = signal('');
  readonly errores = signal<Record<string, string>>({});
  readonly confirmando = signal(false);
  private readonly api = inject(UsuariosApi);
  private readonly fb = inject(FormBuilder);
  private readonly destruir = inject(DestroyRef);
  readonly roles = roles;
  readonly formulario = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(200), Validators.pattern(/\S/)]],
    email: ['', [validarCorreo, Validators.maxLength(254)]],
    roleCode: ['solicitante' as Rol, Validators.required],
    authProvider: ['local' as Proveedor, Validators.required],
    temporary: [false],
    expiresAt: [''],
    notes: ['', Validators.maxLength(2000)],
  });
  ngOnInit() {
    const cuenta = this.cuenta();
    if (cuenta) {
      this.formulario.patchValue({
        ...cuenta,
        notes: cuenta.notes ?? '',
        expiresAt: fechaParaCampo(cuenta.expiresAt),
      });
      this.formulario.controls.email.disable();
      this.formulario.controls.authProvider.disable();
      this.formulario.controls.temporary.disable();
      if (this.propio()) this.formulario.controls.roleCode.disable();
    }
    this.formulario.controls.temporary.valueChanges
      .pipe(takeUntilDestroyed(this.destruir))
      .subscribe((temporal) => {
        if (temporal) {
          this.formulario.controls.authProvider.setValue('local');
          this.formulario.controls.authProvider.disable();
        } else if (!this.cuenta()) this.formulario.controls.authProvider.enable();
      });
    this.formulario.valueChanges.pipe(takeUntilDestroyed(this.destruir)).subscribe(() => {
      this.errores.set({});
      this.error.set('');
      this.confirmando.set(false);
    });
  }
  opcionesAcceso() {
    return [
      { valor: 'local', etiqueta: 'Local' },
      {
        valor: 'directory',
        etiqueta: 'Directorio',
        deshabilitada: this.formulario.controls.temporary.value,
      },
    ];
  }
  campo(nombre: keyof typeof this.formulario.controls) {
    if (this.errores()[nombre]) return this.errores()[nombre];
    const campo = this.formulario.controls[nombre];
    if (!campo.touched || !campo.invalid) return '';
    if (nombre === 'email') return 'Escribe un correo válido de hasta 254 caracteres.';
    if (nombre === 'fullName') return 'Escribe el nombre completo (hasta 200 caracteres).';
    return 'Revisa este campo y su longitud máxima.';
  }
  enviar(confirmado = false) {
    if (this.cargando()) return;
    this.formulario.markAllAsTouched();
    this.error.set('');
    this.errores.set({});
    if (this.formulario.invalid) return;
    const valor = this.formulario.getRawValue();
    const cuenta = this.cuenta();
    const cambioFecha = cuenta
      ? valor.expiresAt !== fechaParaCampo(cuenta.expiresAt)
      : !!valor.expiresAt;
    if (cuenta?.expirationRequired && !valor.expiresAt) {
      this.errores.set({ expiresAt: 'Esta cuenta debe conservar una fecha de vencimiento.' });
      return;
    }
    if (cambioFecha && !fechaFutura(valor.expiresAt)) {
      this.errores.set({ expiresAt: 'Elige una fecha y hora futuras.' });
      return;
    }
    const cambios: CambioCuenta = {};
    if (cuenta) {
      if (valor.fullName.trim() !== cuenta.fullName) cambios.fullName = valor.fullName.trim();
      if (valor.roleCode !== cuenta.roleCode) cambios.roleCode = valor.roleCode;
      if (cambioFecha)
        cambios.expiresAt = valor.expiresAt ? new Date(valor.expiresAt).toISOString() : null;
      if ((valor.notes.trim() || null) !== cuenta.notes) cambios.notes = valor.notes.trim() || null;
      if (!Object.keys(cambios).length) {
        this.cerrar.emit();
        return;
      }
      if (!confirmado && (cambios.roleCode !== undefined || cambios.expiresAt !== undefined)) {
        this.confirmando.set(true);
        return;
      }
    }
    const alta: AltaCuenta = {
      fullName: valor.fullName.trim(),
      email: valor.email.trim(),
      roleCode: valor.roleCode,
      authProvider: valor.authProvider,
      temporary: valor.temporary,
      notes: valor.notes.trim() || null,
      ...(valor.temporary && valor.expiresAt
        ? { expiresAt: new Date(valor.expiresAt).toISOString() }
        : {}),
    };
    this.cargando.set(true);
    (cuenta ? this.api.editar(cuenta.id, cambios) : this.api.crear(alta))
      .pipe(
        takeUntilDestroyed(this.destruir),
        finalize(() => this.cargando.set(false)),
      )
      .subscribe({
        next: (respuesta) => this.guardado.emit(respuesta),
        error: (error) => {
          const fallo = errorAdministracion(error);
          this.error.set(fallo.mensaje);
          if (fallo.campo) this.errores.set({ [fallo.campo]: fallo.mensaje });
          this.confirmando.set(false);
        },
      });
  }
}
