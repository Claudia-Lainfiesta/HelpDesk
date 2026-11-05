import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../core/auth/auth.service';
import { Rol } from '../core/auth/modelos';
import { interpretarError } from '../core/auth/fallo-api';
import { Icono, NombreIcono } from '../shared/ui/icono';
import { Marca } from '../shared/ui/marca';
import { Alerta } from '../shared/ui/alerta';

interface Enlace {
  ruta: string;
  etiqueta: string;
  icono: NombreIcono;
  roles?: Rol[];
}
const enlaces: Enlace[] = [
  { ruta: '/tickets', etiqueta: 'Tickets', icono: 'ticket' },
  { ruta: '/categorias', etiqueta: 'Categorías', icono: 'etiqueta', roles: ['administrador'] },
  { ruta: '/usuarios', etiqueta: 'Usuarios', icono: 'usuarios', roles: ['administrador'] },
  {
    ruta: '/reportes',
    etiqueta: 'Reportes',
    icono: 'reporte',
    roles: ['supervisor', 'administrador'],
  },
];
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, Icono, Marca, Alerta],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app-shell.html',
  host: { '(document:click)': 'cerrarFuera($event)', '(document:keydown.escape)': 'escapar()' },
})
export class AppShell {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destruir = inject(DestroyRef);
  @ViewChild('avatar') private avatar?: ElementRef<HTMLButtonElement>;
  @ViewChild('desplegarNavegacion') private desplegarNavegacion?: ElementRef<HTMLButtonElement>;
  protected readonly menuUsuario = signal(false);
  protected readonly menuNavegacion = signal(false);
  protected readonly error = signal('');
  protected readonly enlaces = computed(() =>
    enlaces.filter(
      (enlace) => !enlace.roles || enlace.roles.includes(this.auth.usuario()?.role as Rol),
    ),
  );
  protected readonly iniciales = computed(
    () =>
      this.auth
        .usuario()
        ?.fullName.trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((parte) => parte[0])
        .join('')
        .toLocaleUpperCase('es') ?? '',
  );
  protected cerrarFuera(evento: Event) {
    if (this.menuUsuario() && !(evento.target as HTMLElement)?.closest('[data-menu-usuario]'))
      this.menuUsuario.set(false);
  }
  protected cerrarMenu() {
    this.menuUsuario.set(false);
    this.avatar?.nativeElement.focus();
  }
  protected escapar() {
    if (this.menuUsuario()) this.cerrarMenu();
    else if (this.menuNavegacion()) {
      this.menuNavegacion.set(false);
      this.desplegarNavegacion?.nativeElement.focus();
    }
  }
  protected salir() {
    this.error.set('');
    this.auth
      .cerrarSesion()
      .pipe(takeUntilDestroyed(this.destruir))
      .subscribe({
        next: () => {
          void this.router.navigateByUrl('/iniciar-sesion');
        },
        error: (error: unknown) => this.error.set(interpretarError(error).message),
      });
  }
}
