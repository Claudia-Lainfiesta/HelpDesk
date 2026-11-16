import { DOCUMENT } from '@angular/common';
import { Injectable, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import {
  EMPTY,
  Subject,
  Subscription,
  catchError,
  filter,
  fromEvent,
  merge,
  of,
  switchMap,
  timer,
} from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { NotificationsApi, Notificacion } from './notificaciones-api';

// Una instancia pertenece a la campana: abandonar el shell cancela toda actividad.
@Injectable()
export class NotificationsService {
  private readonly api = inject(NotificationsApi);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly refresh = new Subject<void>();
  private readonly usuario = computed(() => {
    const u = this.auth.usuario();
    return u && !u.mustChangePassword ? u.id : null;
  });
  private listado?: Subscription;
  private acciones = new Subscription();
  readonly unreadCount = signal(0);
  readonly items = signal<Notificacion[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly procesando = signal(false);
  readonly page = signal(1);
  readonly total = signal(0);
  readonly pageSize = 20;
  constructor() {
    effect((onCleanup) => {
      const id = this.usuario();
      this.limpiar();
      if (!id) return;
      const polling = merge(
        of(null),
        timer(30000, 30000),
        this.router.events.pipe(filter((e) => e instanceof NavigationEnd)),
        fromEvent(this.document, 'visibilitychange'),
        this.refresh,
      )
        .pipe(
          filter(() => !this.document.hidden),
          switchMap(() => this.api.contador().pipe(catchError(() => EMPTY))),
        )
        .subscribe((r) => this.unreadCount.set(r.count));
      onCleanup(() => {
        polling.unsubscribe();
        this.limpiar();
      });
    });
    inject(DestroyRef).onDestroy(() => {
      this.limpiar();
      this.refresh.complete();
    });
  }
  private limpiar() {
    this.listado?.unsubscribe();
    this.acciones.unsubscribe();
    this.acciones = new Subscription();
    this.unreadCount.set(0);
    this.items.set([]);
    this.loading.set(false);
    this.procesando.set(false);
    this.error.set('');
    this.page.set(1);
    this.total.set(0);
  }
  cargar(page = 1) {
    if (!this.usuario()) return;
    this.listado?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    this.listado = this.api.listar(page, this.pageSize).subscribe({
      next: (r) => {
        this.items.set(r.items);
        this.page.set(r.pagination.page);
        this.total.set(r.pagination.total);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No fue posible cargar las notificaciones.');
      },
    });
  }
  leer(item: Notificacion, completado: () => void) {
    if (this.procesando() || !this.usuario()) return;
    this.procesando.set(true);
    this.error.set('');
    this.acciones.add(
      this.api.leer(item.id).subscribe({
        next: () => {
          this.items.update((rows) =>
            rows.map((row) =>
              row.id === item.id ? { ...row, readAt: row.readAt ?? new Date().toISOString() } : row,
            ),
          );
          this.procesando.set(false);
          this.refresh.next();
          completado();
        },
        error: () => {
          this.procesando.set(false);
          this.error.set('No fue posible marcar la notificación como leída.');
        },
      }),
    );
  }
  leerTodas() {
    if (this.procesando() || !this.usuario() || !this.unreadCount()) return;
    this.procesando.set(true);
    this.error.set('');
    this.acciones.add(
      this.api.leerTodas().subscribe({
        next: () => {
          this.unreadCount.set(0);
          this.items.update((rows) =>
            rows.map((row) => ({ ...row, readAt: row.readAt ?? new Date().toISOString() })),
          );
          this.procesando.set(false);
          this.refresh.next();
        },
        error: () => {
          this.procesando.set(false);
          this.error.set('No fue posible marcar las notificaciones como leídas.');
        },
      }),
    );
  }
}
