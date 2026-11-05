import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Boton } from '../../shared/ui/boton';
import { CampoTexto } from '../../shared/ui/campo-texto';
import { Icono, NombreIcono } from '../../shared/ui/icono';
import { Alerta } from '../../shared/ui/alerta';
import { Tarjeta } from '../../shared/ui/tarjeta';
import { Filtro } from '../../shared/ui/filtro';
import { InsigniaEstado, EstadoTicket } from '../../shared/ui/insignia-estado';

@Component({
  selector: 'app-guia-ui',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    Boton,
    CampoTexto,
    Icono,
    Alerta,
    Tarjeta,
    Filtro,
    InsigniaEstado,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<main class="mx-auto max-w-[1180px] space-y-8 px-6 py-10">
    <div>
      <h1>Guía de interfaz</h1>
      <p class="mt-3 text-texto-suave">Galería disponible únicamente durante el desarrollo.</p>
      <a
        routerLink="/tickets"
        class="mt-3 inline-block rounded-boton font-semibold text-primario underline"
        >Volver a HelpDesk</a
      >
    </div>
    <section aria-labelledby="paleta">
      <h2 id="paleta" class="mb-4 text-xl font-bold text-primario">Colores por etiqueta</h2>
      <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
        @for (token of colores(); track token.nombre) {
          <app-tarjeta
            ><div
              class="h-14 rounded-t-tarjeta border-b border-linea"
              [style.background-color]="'var(--color-' + token.nombre + ')'"
              aria-hidden="true"
            ></div>
            <div class="p-3">
              <p class="font-semibold">{{ token.nombre }}</p>
              <p class="mt-1 text-xs text-texto-suave">{{ token.valor }}</p>
            </div></app-tarjeta
          >
        }
      </div>
    </section>
    <app-tarjeta
      ><section class="space-y-5 p-6">
        <h2 class="text-xl font-bold text-primario">Botones e íconos</h2>
        <div class="flex flex-wrap gap-3">
          @for (variante of variantesBoton; track variante) {
            <app-boton [variante]="variante" icono="mas">{{ variante }}</app-boton>
          }
          <app-boton tamano="sm">Pequeño</app-boton
          ><app-boton [cargando]="true">Guardando</app-boton
          ><app-boton [deshabilitado]="true">Deshabilitado</app-boton>
        </div>
        <div class="flex flex-wrap gap-6">
          @for (icono of iconos; track icono) {
            <span class="inline-flex items-center gap-2"
              ><app-icono [nombre]="icono" />{{ icono }}</span
            >
          }
        </div>
      </section></app-tarjeta
    >
    <app-tarjeta
      ><section class="grid gap-5 p-6 md:grid-cols-2">
        <h2 class="text-xl font-bold text-primario md:col-span-2">Campos</h2>
        <app-campo-texto
          identificador="guia-correo"
          etiqueta="Correo"
          tipo="email"
          icono="correo"
          marcador="nombre@empresa.com"
          ayuda="Usa el correo de la empresa."
          [formControl]="correo"
        /><app-campo-texto
          identificador="guia-error"
          etiqueta="Campo con error"
          error="Revisa el valor enviado."
          ayuda="Ejemplo de ayuda asociada."
          [formControl]="campoError"
        /></section
    ></app-tarjeta>
    <app-tarjeta
      ><section class="space-y-5 p-6">
        <h2 class="text-xl font-bold text-primario">Estados y filtros</h2>
        <div class="flex flex-wrap gap-3">
          @for (estado of estados; track estado) {
            <app-insignia-estado [codigo]="estado" />
          }
        </div>
        <div class="flex gap-3">
          <app-filtro [activo]="activo()" (seleccionado)="activo.set(true)">Todos</app-filtro
          ><app-filtro [activo]="!activo()" (seleccionado)="activo.set(false)"
            >Otro filtro</app-filtro
          >
        </div>
      </section></app-tarjeta
    >
    <section class="space-y-3" aria-label="Alertas">
      @for (variante of variantesAlerta; track variante) {
        <app-alerta [variante]="variante"
          >Mensaje de {{ variante }} con información clara y texto visible.</app-alerta
        >
      }
    </section>
  </main>`,
})
export class GuiaUi {
  private readonly documento = inject(DOCUMENT);
  private readonly nombres = [
    'transparent',
    'current',
    'inherit',
    'fondo',
    'superficie',
    'superficie-suave',
    'linea',
    'texto',
    'texto-suave',
    'primario',
    'primario-hover',
    'sobre-primario',
    'acento',
    'foco',
    ...['creado', 'en-proceso', 'en-espera', 'resuelto', 'cerrado', 'cancelado'].flatMap(
      (estado) => [`estado-${estado}`, `estado-${estado}-suave`],
    ),
    ...['exito', 'aviso', 'peligro', 'info'].flatMap((tipo) => [tipo, `${tipo}-suave`]),
  ];
  protected readonly colores = computed(() =>
    this.nombres.map((nombre) => ({
      nombre,
      valor:
        this.documento.defaultView
          ?.getComputedStyle(this.documento.documentElement)
          .getPropertyValue(`--color-${nombre}`)
          .trim() ?? '',
    })),
  );
  protected readonly variantesBoton = ['primario', 'secundario', 'peligro', 'fantasma'] as const;
  protected readonly variantesAlerta = ['exito', 'aviso', 'peligro', 'info'] as const;
  protected readonly estados: EstadoTicket[] = [
    'creado',
    'en_proceso',
    'en_espera',
    'resuelto',
    'cerrado',
    'cancelado',
  ];
  protected readonly iconos: NombreIcono[] = [
    'ticket',
    'etiqueta',
    'usuarios',
    'reporte',
    'buscar',
    'mas',
    'correo',
    'candado',
    'salir',
    'llave',
    'desplegar',
  ];
  protected readonly correo = new FormControl('', { nonNullable: true });
  protected readonly campoError = new FormControl('', { nonNullable: true });
  protected readonly activo = signal(true);
}
