import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, combineLatest, finalize, startWith, switchMap } from 'rxjs';
import { TicketsApi, Ticket } from '../../core/tickets/tickets-api';
import { interpretarError } from '../../core/auth/fallo-api';
import { FechaLocal } from '../../core/administracion/fechas';
import { Tarjeta } from '../../shared/ui/tarjeta';
import { Alerta } from '../../shared/ui/alerta';
import { Boton } from '../../shared/ui/boton';
import { InsigniaEstado } from '../../shared/ui/insignia-estado';
import { AvisoFlotante } from '../../shared/ui/aviso-flotante';
@Component({
  selector: 'app-detalle-ticket',
  standalone: true,
  imports: [RouterLink, FechaLocal, Tarjeta, Alerta, Boton, InsigniaEstado, AvisoFlotante],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <a
      routerLink="/tickets"
      class="mb-6 inline-block rounded-boton font-semibold text-primario underline"
      >Volver a Tickets</a
    >
    @if (cargando()) {
      <p role="status" class="py-10 text-texto-suave">Cargando ticket…</p>
    } @else if (error()) {
      <app-alerta variante="peligro">{{ error() }}</app-alerta>
      @if (!noEncontrado()) {
        <app-boton variante="secundario" (accion)="recargar.next()">Reintentar</app-boton>
      }
    } @else if (ticket(); as t) {
      <section [attr.aria-label]="t.number">
        <div class="mb-6 flex flex-wrap items-center gap-4">
          <h1>{{ t.number }}</h1>
          <app-insignia-estado [codigo]="t.status" />
        </div>
        <app-tarjeta
          ><div class="space-y-6 p-7">
            <h2 class="text-xl font-bold text-primario">{{ t.subject }}</h2>
            <dl class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt class="font-semibold text-texto-suave">Categoría</dt>
                <dd>{{ t.category.name }}</dd>
              </div>
              <div>
                <dt class="font-semibold text-texto-suave">Solicitante</dt>
                <dd>
                  {{ t.requester.fullName
                  }}<span class="block text-sm text-texto-suave">{{ t.requester.email }}</span>
                </dd>
              </div>
              <div>
                <dt class="font-semibold text-texto-suave">Agente</dt>
                <dd>{{ t.assignedAgent?.fullName || 'Sin asignar' }}</dd>
              </div>
              <div>
                <dt class="font-semibold text-texto-suave">Creación</dt>
                <dd>{{ t.createdAt | fechaLocal }}</dd>
              </div>
            </dl>
            <div class="border-t border-linea pt-5">
              <h3 class="mb-3 font-semibold">Descripción</h3>
              <p class="whitespace-pre-wrap break-words leading-relaxed">{{ t.description }}</p>
            </div>
          </div></app-tarjeta
        >
      </section>
    }
    <app-aviso-flotante />`,
})
export class DetalleTicket {
  private readonly api = inject(TicketsApi);
  private readonly ruta = inject(ActivatedRoute);
  private readonly destruir = inject(DestroyRef);
  readonly ticket = signal<Ticket | null>(null);
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly noEncontrado = signal(false);
  readonly recargar = new Subject<void>();
  constructor() {
    combineLatest([this.ruta.paramMap, this.recargar.pipe(startWith(undefined))])
      .pipe(
        switchMap(([p]) => {
          this.cargando.set(true);
          this.error.set('');
          this.noEncontrado.set(false);
          this.ticket.set(null);
          return this.api.obtener(p.get('id') ?? '').pipe(
            catchError((e) => {
              const f = interpretarError(e);
              this.noEncontrado.set(f.estado === 404);
              this.error.set(f.estado === 404 ? 'No se encontró el ticket.' : f.message);
              return EMPTY;
            }),
            finalize(() => this.cargando.set(false)),
          );
        }),
        takeUntilDestroyed(this.destruir),
      )
      .subscribe((t) => this.ticket.set(t));
  }
}
