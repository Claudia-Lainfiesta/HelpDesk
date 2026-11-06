import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnDestroy,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  EMPTY,
  Subject,
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  finalize,
  startWith,
  switchMap,
} from 'rxjs';
import { UsuariosApi } from '../../core/administracion/usuarios-api';
import {
  Cuenta,
  CuentaConClave,
  FiltrosUsuarios,
  Proveedor,
  roles,
} from '../../core/administracion/modelos';
import { Rol } from '../../core/auth/modelos';
import { AuthService } from '../../core/auth/auth.service';
import { errorAdministracion } from '../../core/administracion/errores';
import { FechaLocal } from '../../core/administracion/fechas';
import { Boton } from '../../shared/ui/boton';
import { CampoTexto } from '../../shared/ui/campo-texto';
import { Selector } from '../../shared/ui/selector';
import { Interruptor } from '../../shared/ui/interruptor';
import { TablaPaginada } from '../../shared/ui/tabla-paginada';
import { Paginador } from '../../shared/ui/paginador';
import { Tarjeta } from '../../shared/ui/tarjeta';
import { InsigniaCuenta } from '../../shared/ui/insignia-cuenta';
import { AccionFila, MenuAcciones } from '../../shared/ui/menu-acciones';
import { Confirmacion } from '../../shared/ui/confirmacion';
import { ClaveTemporal } from '../../shared/ui/clave-temporal';
import { Avisos, AvisoFlotante } from '../../shared/ui/aviso-flotante';
import { FormularioUsuario } from './formulario-usuario';

export function leerFiltros(parametros: {
  get: (clave: string) => string | null;
}): FiltrosUsuarios {
  const numero = (clave: string, defecto: number, maximo: number) => {
    const valor = parametros.get(clave) ?? '';
    return /^\d+$/.test(valor) && Number(valor) >= 1 && Number(valor) <= maximo
      ? Number(valor)
      : defecto;
  };
  const booleano = (clave: string) =>
    parametros.get(clave) === 'true' ? true : parametros.get(clave) === 'false' ? false : undefined;
  const rol = parametros.get('role');
  const proveedor = parametros.get('provider');
  return {
    page: numero('page', 1, 1000000),
    pageSize: numero('pageSize', 20, 100),
    q: (parametros.get('q') ?? '').trim().slice(0, 100) || undefined,
    role: roles.some((r) => r.valor === rol) ? (rol as Rol) : undefined,
    active: booleano('active'),
    provider: proveedor === 'local' || proveedor === 'directory' ? proveedor : undefined,
    temporary: booleano('temporary'),
    expired: booleano('expired'),
  };
}
@Component({
  selector: 'app-usuarios',
  standalone: true,
  host: { class: 'block min-w-0' },
  imports: [
    ReactiveFormsModule,
    Boton,
    CampoTexto,
    Selector,
    Interruptor,
    TablaPaginada,
    Paginador,
    Tarjeta,
    InsigniaCuenta,
    MenuAcciones,
    Confirmacion,
    ClaveTemporal,
    AvisoFlotante,
    FormularioUsuario,
    FechaLocal,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './usuarios.html',
})
export class Usuarios implements OnDestroy {
  private readonly api = inject(UsuariosApi);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destruir = inject(DestroyRef);
  private readonly cambios = inject(ChangeDetectorRef);
  readonly auth = inject(AuthService);
  private readonly avisos = inject(Avisos);
  readonly cuentas = signal<Cuenta[]>([]);
  readonly total = signal(0);
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly filtros = signal<FiltrosUsuarios>({ page: 1, pageSize: 20 });
  readonly recargar = new Subject<void>();
  readonly busqueda = new FormControl('', { nonNullable: true });
  readonly rol = new FormControl('', { nonNullable: true });
  readonly estado = new FormControl('', { nonNullable: true });
  readonly proveedor = new FormControl('', { nonNullable: true });
  readonly temporales = new FormControl(false, { nonNullable: true });
  readonly vencidas = new FormControl(false, { nonNullable: true });
  readonly opcionesRol = [{ valor: '', etiqueta: 'Todos los roles' }, ...roles];
  readonly opcionesEstado = [
    { valor: '', etiqueta: 'Todos los estados' },
    { valor: 'true', etiqueta: 'Activos' },
    { valor: 'false', etiqueta: 'Inactivos' },
  ];
  readonly opcionesProveedor = [
    { valor: '', etiqueta: 'Todos los accesos' },
    { valor: 'local', etiqueta: 'Local' },
    { valor: 'directory', etiqueta: 'Directorio' },
  ];
  readonly columnas = ['Usuario', 'Rol', 'Acceso', 'Estado', 'Último acceso', 'Acciones'];
  readonly rejilla = 'minmax(210px, 1.7fr) 130px 180px 130px 150px 64px';
  readonly formularioAbierto = signal(false);
  readonly editarCuenta = signal<Cuenta | null>(null);
  readonly pendiente = signal<{
    cuenta: Cuenta;
    accion: string;
    titulo: string;
    mensaje: string;
    peligro: boolean;
  } | null>(null);
  readonly procesando = signal(false);
  readonly errorAccion = signal('');
  readonly mostrarClave = signal(false);
  readonly nombreClave = signal('');
  private readonly dialogoClave = viewChild(ClaveTemporal);
  constructor() {
    combineLatest([this.ruta.queryParamMap, this.recargar.pipe(startWith(undefined))])
      .pipe(
        switchMap(([parametros]) => {
          const filtros = leerFiltros(parametros);
          this.filtros.set(filtros);
          this.busqueda.setValue(filtros.q ?? '', { emitEvent: false });
          this.rol.setValue(filtros.role ?? '', { emitEvent: false });
          this.estado.setValue(filtros.active === undefined ? '' : String(filtros.active), {
            emitEvent: false,
          });
          this.proveedor.setValue(filtros.provider ?? '', { emitEvent: false });
          this.temporales.setValue(filtros.temporary === true, { emitEvent: false });
          this.vencidas.setValue(filtros.expired === true, { emitEvent: false });
          this.cargando.set(true);
          this.error.set('');
          return this.api.listar(filtros).pipe(
            catchError((error) => {
              this.error.set(errorAdministracion(error).mensaje);
              this.cuentas.set([]);
              return EMPTY;
            }),
            finalize(() => this.cargando.set(false)),
          );
        }),
        takeUntilDestroyed(this.destruir),
      )
      .subscribe((respuesta) => {
        this.cuentas.set(respuesta.data);
        this.total.set(respuesta.total);
        if (!respuesta.data.length && respuesta.total > 0 && respuesta.page > 1)
          this.pagina(Math.max(1, Math.ceil(respuesta.total / respuesta.pageSize)));
      });
    this.busqueda.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destruir))
      .subscribe((q) => this.filtrar({ q: q.trim().slice(0, 100) || undefined }));
    this.rol.valueChanges
      .pipe(takeUntilDestroyed(this.destruir))
      .subscribe((role) => this.filtrar({ role: (role || undefined) as Rol | undefined }));
    this.estado.valueChanges
      .pipe(takeUntilDestroyed(this.destruir))
      .subscribe((active) =>
        this.filtrar({ active: active === '' ? undefined : active === 'true' }),
      );
    this.proveedor.valueChanges
      .pipe(takeUntilDestroyed(this.destruir))
      .subscribe((provider) =>
        this.filtrar({ provider: (provider || undefined) as Proveedor | undefined }),
      );
    this.temporales.valueChanges
      .pipe(takeUntilDestroyed(this.destruir))
      .subscribe((temporary) => this.filtrar({ temporary: temporary || undefined }));
    this.vencidas.valueChanges
      .pipe(takeUntilDestroyed(this.destruir))
      .subscribe((expired) => this.filtrar({ expired: expired || undefined }));
  }
  filtrar(cambios: Partial<FiltrosUsuarios>) {
    this.navegar({ ...this.filtros(), ...cambios, page: 1 });
  }
  pagina(page: number) {
    this.navegar({ ...this.filtros(), page });
  }
  private navegar(filtros: FiltrosUsuarios) {
    void this.router.navigate([], { relativeTo: this.ruta, queryParams: filtros });
  }
  vencida(cuenta: Cuenta) {
    return !!cuenta.expiresAt && new Date(cuenta.expiresAt).getTime() <= Date.now();
  }
  bloqueada(cuenta: Cuenta) {
    return !!cuenta.lockedUntil && new Date(cuenta.lockedUntil).getTime() > Date.now();
  }
  nombreRol(codigo: Rol) {
    return roles.find((r) => r.valor === codigo)?.etiqueta ?? codigo;
  }
  propio(cuenta: Cuenta) {
    return cuenta.id === this.auth.usuario()?.id;
  }
  acciones(cuenta: Cuenta): AccionFila[] {
    const propio = this.propio(cuenta);
    return [
      { codigo: 'editar', etiqueta: 'Editar' },
      ...(cuenta.authProvider === 'local'
        ? [
            {
              codigo: 'restablecer',
              etiqueta: 'Restablecer contraseña',
              deshabilitada: propio,
              explicacion: propio
                ? 'Para tu cuenta, usa Cambiar contraseña en el menú superior.'
                : undefined,
            },
          ]
        : []),
      ...(this.bloqueada(cuenta) ? [{ codigo: 'desbloquear', etiqueta: 'Desbloquear' }] : []),
      cuenta.isActive
        ? {
            codigo: 'desactivar',
            etiqueta: 'Desactivar',
            peligro: true,
            deshabilitada: propio,
            explicacion: propio ? 'No puedes desactivar tu propia cuenta.' : undefined,
          }
        : { codigo: 'reactivar', etiqueta: 'Reactivar' },
    ];
  }
  nuevo() {
    this.editarCuenta.set(null);
    this.formularioAbierto.set(true);
  }
  elegir(cuenta: Cuenta, accion: string) {
    if (this.acciones(cuenta).find((a) => a.codigo === accion)?.deshabilitada) return;
    if (accion === 'editar') {
      this.editarCuenta.set(cuenta);
      this.formularioAbierto.set(true);
      return;
    }
    const textos: Record<string, [string, string]> = {
      restablecer: [
        'Restablecer contraseña',
        'Se generará una contraseña temporal nueva y se cerrarán todas sus sesiones.',
      ],
      desbloquear: [
        'Desbloquear cuenta',
        'Se reiniciarán los intentos fallidos y el bloqueo de acceso.',
      ],
      desactivar: [
        'Desactivar cuenta',
        'La cuenta dejará de poder iniciar sesión y se cerrarán todas sus sesiones.',
      ],
      reactivar: [
        'Reactivar cuenta',
        'Podrá ingresar de nuevo si su cuenta no está vencida. Reactivar no renueva el vencimiento.',
      ],
    };
    const texto = textos[accion];
    if (!texto) return;
    this.errorAccion.set('');
    this.pendiente.set({
      cuenta,
      accion,
      titulo: texto[0],
      mensaje: `${cuenta.fullName}: ${texto[1]}`,
      peligro: accion === 'desactivar' || accion === 'restablecer',
    });
  }
  ejecutar() {
    const pendiente = this.pendiente();
    if (!pendiente || this.procesando()) return;
    const { cuenta, accion } = pendiente;
    const solicitud =
      accion === 'desactivar'
        ? this.api.desactivar(cuenta.id)
        : accion === 'reactivar'
          ? this.api.reactivar(cuenta.id)
          : accion === 'restablecer'
            ? this.api.restablecerClave(cuenta.id)
            : this.api.desbloquear(cuenta.id);
    this.procesando.set(true);
    solicitud
      .pipe(
        takeUntilDestroyed(this.destruir),
        finalize(() => this.procesando.set(false)),
      )
      .subscribe({
        next: (respuesta) => {
          this.pendiente.set(null);
          this.guardado(respuesta, 'Acción realizada correctamente.');
        },
        error: (error) => {
          const mensaje = errorAdministracion(error).mensaje;
          this.errorAccion.set(mensaje);
          this.avisos.mostrar(mensaje, true);
        },
      });
  }
  guardado(respuesta: CuentaConClave, mensaje = 'Usuario guardado correctamente.') {
    this.formularioAbierto.set(false);
    this.editarCuenta.set(null);
    if (respuesta.temporaryPassword) {
      this.nombreClave.set(respuesta.fullName);
      this.mostrarClave.set(true);
      this.cambios.detectChanges();
      this.dialogoClave()?.entregar(respuesta.temporaryPassword);
      delete respuesta.temporaryPassword;
    }
    this.recargar.next();
    this.avisos.mostrar(mensaje);
  }
  cerrarClave() {
    this.dialogoClave()?.entregar('');
    this.mostrarClave.set(false);
    this.nombreClave.set('');
  }
  ngOnDestroy() {
    this.dialogoClave()?.entregar('');
    this.recargar.complete();
  }
}
