import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Tarjeta } from '../../shared/ui/tarjeta';
@Component({
  selector: 'app-pagina-informativa',
  standalone: true,
  imports: [Tarjeta, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="mx-auto max-w-2xl py-8">
    <app-tarjeta
      ><div class="p-8">
        <h1>{{ datos['titulo'] }}</h1>
        <p class="mt-4 leading-relaxed text-texto-suave">
          {{ datos['mensaje'] || 'Esta sección estará disponible pronto.' }}
        </p>
        <a
          routerLink="/tickets"
          class="mt-6 inline-block rounded-boton font-semibold text-primario underline underline-offset-4"
          >Volver a tickets</a
        >
      </div></app-tarjeta
    >
  </section>`,
})
export class PaginaInformativa {
  protected readonly datos = inject(ActivatedRoute).snapshot.data;
}
