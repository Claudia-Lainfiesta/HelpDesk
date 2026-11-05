# Diseño de HelpDesk

La referencia visual es [HelpDesk-diseno.pdf](referencia/HelpDesk-diseno.pdf).
La interfaz usa superficies claras, azul de marca, bordes ligeros y espacio entre
filas. El naranja se reserva para íconos, decoración y foco. La base de texto es
14 px; los títulos de página tienen 28 px y el titular del acceso, 34 px.

## Colores por significado

`src/styles.css` es la única fuente de valores. `@theme static` vacía la paleta
predeterminada mediante `--color-*: initial` y declara únicamente los tokens de
esta tabla. Los componentes usan `bg-primario`, `text-texto-suave`,
`border-linea`, etc. El color sólido se llama `X`; su fondo claro, `X-suave`.
La galería lee los valores computados de CSS: no mantiene otra paleta en TypeScript.

| Etiqueta                  | Valor en los tokens   | Uso                                        | Cuándo no usarlo                                         |
| ------------------------- | --------------------- | ------------------------------------------ | -------------------------------------------------------- |
| `transparent`             | `transparent`         | Transparencia, color actual o herencia     | No sustituye una etiqueta de negocio                     |
| `current`                 | `currentColor`        | Transparencia, color actual o herencia     | No sustituye una etiqueta de negocio                     |
| `inherit`                 | `inherit`             | Transparencia, color actual o herencia     | No sustituye una etiqueta de negocio                     |
| `fondo`                   | `#edf1f6`             | Fondo de página y panel de presentación    | No usar como color de texto                              |
| `superficie`              | `#ffffff`             | Tarjetas, barra superior y panel de acceso | No usar como color de texto                              |
| `superficie-suave`        | `#f5f8fc`             | Campos de formulario                       | No usar como color de texto                              |
| `linea`                   | `#dbe2ea`             | Bordes y separadores                       | No usar como color de texto                              |
| `texto`                   | `#0d1d2e`             | Texto principal                            | No usar como señal única de un estado                    |
| `texto-suave`             | `#53627a`             | Texto secundario y marcadores              | No usar como señal única de un estado                    |
| `primario`                | `#0e2a52`             | Acciones, marca y títulos                  | No sustituir estados semánticos                          |
| `primario-hover`          | `#173a6b`             | Acción primaria bajo el puntero            | No sustituir estados semánticos                          |
| `sobre-primario`          | `#ffffff`             | Texto e íconos sobre el primario           | No usar sobre-primario sobre superficies claras          |
| `acento`                  | `#f4811f`             | Íconos y decoración                        | No usar para texto pequeño ni como fondo principal       |
| `foco`                    | `var(--color-acento)` | Anillo de foco                             | No usar para texto pequeño ni como fondo principal       |
| `estado-creado`           | `#3d506f`             | Texto/punto del estado                     | No usar en botones o mensajes sin relación con el estado |
| `estado-creado-suave`     | `#e8edf7`             | Fondo de insignia                          | No usar en botones o mensajes sin relación con el estado |
| `estado-en-proceso`       | `#126780`             | Texto/punto del estado                     | No usar en botones o mensajes sin relación con el estado |
| `estado-en-proceso-suave` | `#dcf3fb`             | Fondo de insignia                          | No usar en botones o mensajes sin relación con el estado |
| `estado-en-espera`        | `#845202`             | Texto/punto del estado                     | No usar en botones o mensajes sin relación con el estado |
| `estado-en-espera-suave`  | `#fdeed0`             | Fondo de insignia                          | No usar en botones o mensajes sin relación con el estado |
| `estado-resuelto`         | `#10653f`             | Texto/punto del estado                     | No usar en botones o mensajes sin relación con el estado |
| `estado-resuelto-suave`   | `#dcf4e6`             | Fondo de insignia                          | No usar en botones o mensajes sin relación con el estado |
| `estado-cerrado`          | `#4d5260`             | Texto/punto del estado                     | No usar en botones o mensajes sin relación con el estado |
| `estado-cerrado-suave`    | `#e7eaef`             | Fondo de insignia                          | No usar en botones o mensajes sin relación con el estado |
| `estado-cancelado`        | `#89221f`             | Texto/punto del estado                     | No usar en botones o mensajes sin relación con el estado |
| `estado-cancelado-suave`  | `#fde2e4`             | Fondo de insignia                          | No usar en botones o mensajes sin relación con el estado |
| `exito`                   | `#10653f`             | Texto de mensaje                           | No usar para decorar contenido sin ese significado       |
| `exito-suave`             | `#dcf4e6`             | Fondo de mensaje                           | No usar para decorar contenido sin ese significado       |
| `aviso`                   | `#845202`             | Texto de mensaje                           | No usar para decorar contenido sin ese significado       |
| `aviso-suave`             | `#fdeed0`             | Fondo de mensaje                           | No usar para decorar contenido sin ese significado       |
| `peligro`                 | `#b42318`             | Texto de mensaje                           | No usar para decorar contenido sin ese significado       |
| `peligro-suave`           | `#fde2e4`             | Fondo de mensaje                           | No usar para decorar contenido sin ese significado       |
| `info`                    | `#126780`             | Texto de mensaje                           | No usar para decorar contenido sin ese significado       |
| `info-suave`              | `#dcf3fb`             | Fondo de mensaje                           | No usar para decorar contenido sin ese significado       |

Las variantes de insignias y alertas incluyen fondo y texto de contraste.
Siempre acompañan el color con texto. Sobre fondo claro, `acento` no tiene
contraste suficiente para texto pequeño; utiliza `texto`, `primario` o el token
semántico de mensaje correspondiente.

## Forma, tipografía e íconos

| Etiqueta           | Valor                                  | Uso                                   |
| ------------------ | -------------------------------------- | ------------------------------------- |
| `rounded-boton`    | 0.5rem (8 px)                          | Botones, filtros, campos y navegación |
| `rounded-tarjeta`  | 0.875rem (14 px)                       | Tarjetas y paneles                    |
| `rounded-insignia` | 9999px                                 | Insignias, su punto y avatar          |
| `shadow-tarjeta`   | 0 1px 2px; texto al 6 %                | Sombra ligera de las tarjetas         |
| `font-sans`        | Figtree Variable y fuentes del sistema | Toda la aplicación                    |

Figtree está autoalojada mediante `@fontsource-variable/figtree`; no se hacen
peticiones a servicios de fuentes. Los SVG de `app-icono` son locales, de trazo
1.8 px. El paquete consultado `lucide-angular` declara Angular 13–21, por lo
que se eligió un componente SVG compatible con Angular 22.

Nombres de íconos: `ticket`, `etiqueta`, `usuarios`, `reporte`, `buscar`, `mas`,
`correo`, `candado`, `salir`, `llave`, `desplegar` y `menu`. Al acompañar texto
son decorativos (`aria-hidden`). Si un ícono va solo, usa su entrada `etiqueta`
o un `aria-label` en el botón que lo contiene.

## Componentes compartidos

Todos están en `src/app/shared/ui/`, son standalone y usan detección OnPush.

| Componente            | Entradas y comportamiento                                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app-icono`           | `nombre`, `tamano`, `etiqueta` opcional                                                                                                           |
| `app-boton`           | `variante`: primario/secundario/peligro/fantasma; `tamano`: md/sm; `tipo`, `icono`, `cargando`, `deshabilitado`, `anchoCompleto`; salida `accion` |
| `app-campo-texto`     | `identificador` único, `etiqueta`, `tipo`, `icono`, `marcador`, `autocompletar`, `ayuda`, `error`, `ocultarEtiqueta`; ControlValueAccessor        |
| `app-insignia-estado` | `codigo`: creado/en_proceso/en_espera/resuelto/cerrado/cancelado                                                                                  |
| `app-filtro`          | `activo`; salida `seleccionado`; expone aria-pressed                                                                                              |
| `app-alerta`          | `variante`: exito/aviso/peligro/info; peligro usa alert, el resto status                                                                          |
| `app-tarjeta`         | Contenido proyectado con superficie, borde, radio y sombra                                                                                        |
| `app-marca`           | Marca HelpDesk con ícono de ticket                                                                                                                |

Ejemplo con formularios reactivos:

```html
<form [formGroup]="formulario" (ngSubmit)="guardar()">
  <app-campo-texto
    identificador="correo-ejemplo"
    etiqueta="Correo"
    tipo="email"
    icono="correo"
    autocompletar="username"
    formControlName="correo"
    [error]="errorCorreo()"
  />
  <app-boton tipo="submit" [cargando]="cargando()">Guardar</app-boton>
</form>
```

El identificador pertenece al input, sin duplicarlo en el host. Label, ayuda y
error están asociados mediante `for` y `aria-describedby`. Los botones cargando
quedan deshabilitados; la lógica de envío también impide peticiones duplicadas.

## Galería y producción

Con `npm start`, abre http://localhost:4200/guia-ui. Incluye la paleta completa,
botones, íconos, campos, insignias, filtros, alertas y tarjetas. No exige una
sesión porque es una herramienta local de desarrollo.

Producción reemplaza `rutas-desarrollo.ts` por
`rutas-desarrollo.produccion.ts`, que exporta una lista vacía. Así se excluyen
la ruta y el componente de galería del bundle. `npm run verify:production`
comprueba el resultado después de `npm run build`; forma parte de `check` y CI.

## Reglas y cambios

- Nada de colores crudos en componentes o plantillas: sin hexadecimales,
  funciones de color, clases de paleta ni colores arbitrarios.
- Sin emojis, morados, índigos, violetas ni fucsias.
- Todos los elementos interactivos tienen foco visible con `foco`. Los menús
  se recorren con Tab y se cierran con Escape. Hay un enlace para saltar al contenido.
- No se transmite información solo con color. Las animaciones respetan
  `prefers-reduced-motion`.
- Un color nuevo necesita un significado: decláralo primero en el único bloque
  de tokens, agrégalo a la galería y actualiza esta tabla. Para cambiar uno,
  modifica su valor en ese bloque; evita crear variantes locales por pantalla.

`npm run lint:tokens` revisa archivos TS, HTML, CSS, SCSS y SVG de `src/`.
Solo exceptúa los valores de color del archivo global de tokens. También
rechaza emojis, incluso en ese archivo. Cada error indica ruta y línea.
`npm run test:tokens` crea archivos temporales para probar detección, código de
salida y aceptación de etiquetas válidas. No agrega dependencias.
El análisis es estático: cualquier estilo nuevo generado en tiempo de ejecución
debe continuar usando variables semánticas y pasar revisión.

## Layout y alcance

La barra superior adapta enlaces al rol y el avatar abre cambio de contraseña
más cierre de sesión. A partir de 1024 px la navegación está visible; por debajo
usa un botón. El contenido útil tiene aproximadamente 1180 px de ancho máximo.
La lista de tickets se desplaza dentro de su contenedor en anchos pequeños.

Tickets usa los seis ejemplos del PDF, un servicio local tipado y filtros en el
cliente. La nota «Datos de ejemplo» permanece visible. Nuevo ticket muestra un
aviso de disponibilidad futura. Categorías, usuarios y reportes son marcadores
protegidos por rol; todavía no consumen APIs de negocio.

Las diferencias intencionales respecto del PDF son los SVG propios, Figtree,
los tamaños y radios semánticos pedidos, la nota de ejemplos y las opciones
funcionales de sesión. Se usa un botón sólido de marca, sin degradados ni
sombras fuertes. No hay un diseño móvil completo.
