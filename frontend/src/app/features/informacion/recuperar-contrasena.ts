import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Tarjeta } from '../../shared/ui/tarjeta';
import { Marca } from '../../shared/ui/marca';
@Component({
  selector: 'app-recuperar-contrasena',
  standalone: true,
  imports: [RouterLink, Tarjeta, Marca],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<main class="mx-auto max-w-xl px-6 py-16">
    <div class="mb-8"><app-marca /></div>
    <app-tarjeta
      ><div class="p-8">
        <h1>Recuperar contraseña</h1>
        <p class="mt-4 leading-relaxed text-texto-suave">
          Si olvidaste tu contraseña, comunícate con un administrador.
        </p>
        <a
          routerLink="/iniciar-sesion"
          class="mt-6 inline-block rounded-boton font-semibold text-primario underline underline-offset-4"
          >Volver a iniciar sesión</a
        >
      </div></app-tarjeta
    >
  </main>`,
})
export class RecuperarContrasena {}
