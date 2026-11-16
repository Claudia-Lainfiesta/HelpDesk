import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { NotificationsService } from '../../core/notificaciones/notificaciones.service';
import { Notificacion } from '../../core/notificaciones/notificaciones-api';
import { FechaLocal } from '../../core/administracion/fechas';
import { Icono } from '../ui/icono';
import { Alerta } from '../ui/alerta';
import { Boton } from '../ui/boton';
@Component({
  selector: 'app-campana',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icono, Alerta, Boton, FechaLocal],
  providers: [NotificationsService],
  templateUrl: './campana.html',
  host: {
    class: 'relative block',
    '(document:click)': 'fuera($event)',
    '(document:keydown.escape)': 'escapar()',
  },
})
export class Campana {
  readonly estado = inject(NotificationsService);
  private readonly router = inject(Router);
  private readonly elemento = inject(ElementRef<HTMLElement>);
  readonly abierto = signal(false);
  readonly badge = computed(() =>
    this.estado.unreadCount() > 99 ? '99+' : String(this.estado.unreadCount()),
  );
  @ViewChild('boton') private boton?: ElementRef<HTMLButtonElement>;
  @ViewChild('panel') set panel(value: ElementRef<HTMLElement> | undefined) {
    value?.nativeElement.focus();
  }
  constructor() {
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.abierto.set(false));
  }
  alternar() {
    if (this.abierto()) this.cerrar();
    else {
      this.abierto.set(true);
      this.estado.cargar();
    }
  }
  cerrar() {
    this.abierto.set(false);
    this.boton?.nativeElement.focus();
  }
  escapar() {
    if (this.abierto()) this.cerrar();
  }
  fuera(event: Event) {
    if (this.abierto() && !this.elemento.nativeElement.contains(event.target as Node))
      this.abierto.set(false);
  }
  seleccionar(item: Notificacion) {
    this.estado.leer(item, () => {
      if (item.ticketId) {
        this.abierto.set(false);
        void this.router.navigate(['/tickets', item.ticketId]);
      }
    });
  }
}
