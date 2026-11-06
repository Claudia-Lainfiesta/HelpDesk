import {
  ChangeDetectionStrategy,
  Component,
  ChangeDetectorRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
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

import { Selector } from '../../shared/ui/selector';
import { AreaTexto } from '../../shared/ui/area-texto';
import { CampoFecha } from '../../shared/ui/campo-fecha';
import { Interruptor } from '../../shared/ui/interruptor';
import { Modal } from '../../shared/ui/modal';
import { Confirmacion } from '../../shared/ui/confirmacion';
import { Paginador } from '../../shared/ui/paginador';
import { TablaPaginada } from '../../shared/ui/tabla-paginada';
import { MenuAcciones } from '../../shared/ui/menu-acciones';
import { ClaveTemporal } from '../../shared/ui/clave-temporal';
import { InsigniaCuenta } from '../../shared/ui/insignia-cuenta';
import { AvisoFlotante, Avisos } from '../../shared/ui/aviso-flotante';

@Component({
  selector: 'app-guia-ui',
  standalone: true,
  imports: [
    Selector,
    AreaTexto,
    CampoFecha,
    Interruptor,
    Modal,
    Confirmacion,
    Paginador,
    TablaPaginada,
    MenuAcciones,
    ClaveTemporal,
    InsigniaCuenta,
    AvisoFlotante,
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
    <app-tarjeta
      ><section class="space-y-5 p-6">
        <h2 class="text-xl font-bold text-primario">Administración: controles e insignias</h2>
        <div class="grid gap-5 md:grid-cols-2">
          <app-selector
            identificador="guia-selector"
            etiqueta="Rol"
            [opciones]="[
              { valor: 'agente', etiqueta: 'Agente' },
              { valor: 'supervisor', etiqueta: 'Supervisor' },
            ]"
            [formControl]="rol"
          /><app-campo-fecha
            identificador="guia-fecha"
            etiqueta="Fecha y hora"
            [formControl]="fecha"
            ayuda="La zona horaria es la del navegador."
          /><app-area-texto
            identificador="guia-notas"
            etiqueta="Notas"
            [formControl]="notas"
          /><app-interruptor
            identificador="guia-temporal"
            etiqueta="Cuenta temporal"
            [formControl]="temporal"
          />
        </div>
        <div class="flex flex-wrap gap-3">
          @for (tipo of tiposCuenta; track tipo) {
            <app-insignia-cuenta [tipo]="tipo" />
          }
          <app-insignia-cuenta tipo="Rol">Agente</app-insignia-cuenta>
        </div>
      </section></app-tarjeta
    >
    <app-tarjeta
      ><section class="space-y-5 p-6">
        <h2 class="text-xl font-bold text-primario">Diálogos, acciones y avisos</h2>
        <div class="flex flex-wrap items-center gap-3">
          <app-boton (accion)="modal.set(true)">Abrir diálogo</app-boton
          ><app-boton variante="secundario" (accion)="confirmacion.set(true)"
            >Pedir confirmación</app-boton
          ><app-boton variante="secundario" (accion)="abrirClave()">Clave de demostración</app-boton
          ><app-boton
            variante="secundario"
            (accion)="avisos.mostrar('Cambios guardados en la demostración.')"
            >Mostrar aviso</app-boton
          ><app-menu-acciones
            nombre="Ejemplo"
            [acciones]="[
              { codigo: 'editar', etiqueta: 'Editar' },
              { codigo: 'desactivar', etiqueta: 'Desactivar', peligro: true },
            ]"
            (seleccionado)="avisos.mostrar('Acción de demostración: ' + $event)"
          />
        </div></section
    ></app-tarjeta>
    <section class="space-y-5">
      <h2 class="text-xl font-bold text-primario">Tabla y paginación</h2>
      <app-tabla-paginada
        nombre="ejemplos"
        [columnas]="['Nombre', 'Estado']"
        rejilla="1fr 140px"
        [anchoMinimo]="420"
        ><app-tarjeta role="row" class="grid grid-cols-2 p-5"
          ><span role="cell">Registro de demostración</span
          ><span role="cell">Activo</span></app-tarjeta
        ></app-tabla-paginada
      ><app-paginador
        [pagina]="pagina()"
        [tamano]="tamano()"
        [total]="45"
        (cambiarPagina)="pagina.set($event)"
        (seleccionarTamano)="tamano.set($event); pagina.set(1)"
      /><app-tabla-paginada
        nombre="ejemplos"
        [columnas]="['Nombre']"
        rejilla="1fr"
        [vacia]="true"
      /><app-tabla-paginada
        nombre="ejemplos"
        [columnas]="['Nombre']"
        rejilla="1fr"
        [cargando]="true"
      /><app-tabla-paginada
        nombre="ejemplos"
        [columnas]="['Nombre']"
        rejilla="1fr"
        error="Ejemplo de error recuperable."
        (reintentar)="avisos.mostrar('Reintento de demostración.')"
      />
    </section>
    @if (modal()) {
      <app-modal titulo="Diálogo de demostración" (cerrar)="modal.set(false)"
        ><p class="mb-4 text-texto-suave">Prueba Tab, Mayús + Tab y Escape.</p>
        <app-boton (accion)="modal.set(false)">Terminar</app-boton></app-modal
      >
    }
    @if (confirmacion()) {
      <app-confirmacion
        titulo="Confirmar acción"
        mensaje="Este ejemplo no modifica datos."
        [peligro]="true"
        (cancelar)="confirmacion.set(false)"
        (confirmar)="confirmacion.set(false); avisos.mostrar('Confirmación recibida.')"
      />
    }
    @if (claveVisible()) {
      <app-clave-temporal
        nombre="Ejemplo generado en el navegador"
        (cerrar)="claveVisible.set(false)"
      />
    }
    <app-aviso-flotante />
  </main>`,
})
export class GuiaUi {
  private readonly documento = inject(DOCUMENT);
  protected readonly avisos = inject(Avisos);
  private readonly cambios = inject(ChangeDetectorRef);
  private readonly clave = viewChild(ClaveTemporal);
  protected readonly modal = signal(false);
  protected readonly confirmacion = signal(false);
  protected readonly claveVisible = signal(false);
  protected readonly pagina = signal(1);
  protected readonly tamano = signal(20);
  protected readonly rol = new FormControl('agente', { nonNullable: true });
  protected readonly fecha = new FormControl('', { nonNullable: true });
  protected readonly notas = new FormControl('', { nonNullable: true });
  protected readonly temporal = new FormControl(false, { nonNullable: true });
  protected readonly tiposCuenta = [
    'Temporal',
    'Vencida',
    'Inactiva',
    'Directorio',
    'Bloqueada',
    'Activa',
  ] as const;
  protected abrirClave() {
    this.claveVisible.set(true);
    this.cambios.detectChanges();
    this.clave()?.entregar(crypto.randomUUID());
  }
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
