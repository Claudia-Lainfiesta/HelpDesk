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
| `estado-creado`           | `#3d506f`             | Texto del estado                           | No usar en botones o mensajes sin relación con el estado |
| `estado-creado-suave`     | `#e8edf7`             | Superficie de apoyo, no insignias          | No usar en botones o mensajes sin relación con el estado |
| `estado-en-proceso`       | `#126780`             | Texto del estado                           | No usar en botones o mensajes sin relación con el estado |
| `estado-en-proceso-suave` | `#dcf3fb`             | Superficie de apoyo, no insignias          | No usar en botones o mensajes sin relación con el estado |
| `estado-en-espera`        | `#845202`             | Texto del estado                           | No usar en botones o mensajes sin relación con el estado |
| `estado-en-espera-suave`  | `#fdeed0`             | Superficie de apoyo, no insignias          | No usar en botones o mensajes sin relación con el estado |
| `estado-resuelto`         | `#10653f`             | Texto del estado                           | No usar en botones o mensajes sin relación con el estado |
| `estado-resuelto-suave`   | `#dcf4e6`             | Superficie de apoyo, no insignias          | No usar en botones o mensajes sin relación con el estado |
| `estado-cerrado`          | `#4d5260`             | Texto del estado                           | No usar en botones o mensajes sin relación con el estado |
| `estado-cerrado-suave`    | `#e7eaef`             | Superficie de apoyo, no insignias          | No usar en botones o mensajes sin relación con el estado |
| `estado-cancelado`        | `#89221f`             | Texto del estado                           | No usar en botones o mensajes sin relación con el estado |
| `estado-cancelado-suave`  | `#fde2e4`             | Superficie de apoyo, no insignias          | No usar en botones o mensajes sin relación con el estado |
| `exito`                   | `#10653f`             | Texto de mensaje                           | No usar para decorar contenido sin ese significado       |
| `exito-suave`             | `#dcf4e6`             | Fondo de mensaje                           | No usar para decorar contenido sin ese significado       |
| `aviso`                   | `#845202`             | Texto de mensaje                           | No usar para decorar contenido sin ese significado       |
| `aviso-suave`             | `#fdeed0`             | Fondo de mensaje                           | No usar para decorar contenido sin ese significado       |
| `peligro`                 | `#b42318`             | Texto de mensaje                           | No usar para decorar contenido sin ese significado       |
| `peligro-suave`           | `#fde2e4`             | Fondo de mensaje                           | No usar para decorar contenido sin ese significado       |
| `info`                    | `#126780`             | Texto de mensaje                           | No usar para decorar contenido sin ese significado       |
| `info-suave`              | `#dcf3fb`             | Fondo de mensaje                           | No usar para decorar contenido sin ese significado       |

Los estados, prioridades y etiquetas de cuenta usan texto semibold con color
semántico, sin fondo, borde, cápsula ni punto decorativo. Las alertas conservan
fondo suave y texto de contraste.
Siempre acompañan el color con texto. Sobre fondo claro, `acento` no tiene
contraste suficiente para texto pequeño; utiliza `texto`, `primario` o el token
semántico de mensaje correspondiente.

## Forma, tipografía e íconos

| Etiqueta           | Valor                                  | Uso                                   |
| ------------------ | -------------------------------------- | ------------------------------------- |
| `rounded-boton`    | 0.5rem (8 px)                          | Botones, filtros, campos y navegación |
| `rounded-tarjeta`  | 0.875rem (14 px)                       | Tarjetas y paneles                    |
| `rounded-insignia` | 9999px                                 | Avatar y contador de notificaciones   |
| `shadow-tarjeta`   | 0 1px 2px; texto al 6 %                | Sombra ligera de las tarjetas         |
| `font-sans`        | Figtree Variable y fuentes del sistema | Toda la aplicación                    |

Figtree está autoalojada mediante `@fontsource-variable/figtree`; no se hacen
peticiones a servicios de fuentes. Los SVG de `app-icono` son locales, de trazo
1.8 px. Se usa el componente SVG propio del repositorio, compatible con Angular 22;
no existe una dependencia externa de iconos en package.json.

Nombres de íconos: `ticket`, `etiqueta`, `usuarios`, `reporte`, `buscar`, `mas`,
`correo`, `candado`, `salir`, `llave`, `desplegar`, `menu`, `cerrar`, `copiar`, `acciones`, `editar`, `campana`, `telegram`, `encendido`, `desbloquear`, `correcto` y `alerta`. Al acompañar texto
son decorativos (`aria-hidden`). Si un ícono va solo, usa su entrada `etiqueta`
o un `aria-label` en el botón que lo contiene.

## Componentes compartidos

Todos están en `src/app/shared/ui/`, son standalone y usan detección OnPush.

| Componente            | Entradas y comportamiento                                                                                                                                                                    |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app-icono`           | `nombre`, `tamano`, `etiqueta` opcional                                                                                                                                                      |
| `app-boton`           | `variante`: primario/secundario/peligro/fantasma; `tamano`: md/sm; `tipo`, `icono`, `cargando`, `deshabilitado`, `anchoCompleto`, `soloIcono`, `etiquetaAccesible`, `ayuda`; salida `accion` |
| `app-campo-texto`     | `identificador` único, `etiqueta`, `tipo`, `icono`, `marcador`, `autocompletar`, `ayuda`, `error`, `ocultarEtiqueta`; ControlValueAccessor                                                   |
| `app-insignia-estado` | `codigo`: creado/en_proceso/en_espera/resuelto/cerrado/cancelado                                                                                                                             |
| `app-filtro`          | `activo`; salida `seleccionado`; expone aria-pressed                                                                                                                                         |
| `app-alerta`          | `variante`: exito/aviso/peligro/info; peligro usa alert, el resto status                                                                                                                     |
| `app-tarjeta`         | Contenido proyectado con superficie, borde, radio y sombra                                                                                                                                   |
| `app-marca`           | Marca HelpDesk con ícono de ticket                                                                                                                                                           |

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

## Componentes de administración

| Componente            | Uso y entradas principales                                                                                           |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `app-selector`        | CVA; `opciones` con valor, etiqueta y deshabilitada; etiqueta, ayuda y error asociados                               |
| `app-area-texto`      | CVA; notas y descripciones, máximo configurable (2000 por defecto)                                                   |
| `app-campo-fecha`     | CVA `datetime-local`; valor en la zona del navegador                                                                 |
| `app-interruptor`     | CVA booleano; etiqueta enlazada y `role="switch"`                                                                    |
| `app-modal`           | Título enlazado, foco atrapado, Escape, retorno del foco y bloqueo del fondo; `ocupado` impide cerrar durante envíos |
| `app-confirmacion`    | Modal con mensaje, cancelar, confirmar y variante de peligro                                                         |
| `app-acciones-fila`   | Iconos directos con aria-label, title y área mínima de 44 × 44 px                                                    |
| `app-menu-acciones`   | Acciones por fila, explicaciones de deshabilitados, flechas, Home/End y Escape                                       |
| `app-tabla-paginada`  | Encabezados, rejilla y filas proyectadas; carga, vacío y error con reintento                                         |
| `app-paginador`       | Rango mostrado, `opcionesTamanos`, tamaño y anterior/siguiente; evita avanzar fuera de rango                         |
| `app-aviso-flotante`  | Servicio `Avisos`, región de estado y cierre automático a los seis segundos                                          |
| `app-clave-temporal`  | Valor transferido con `entregar`, copia explícita y cierre único que lo retira                                       |
| `app-insignia-cuenta` | Temporal, Vencida, Inactiva, Bloqueada, Activa y etiqueta de rol                                                     |

Los controles nuevos comparten `ControlCampo`, implementan formularios reactivos
y usan altura de 46 px, superficie suave y radio de botón. Los diálogos y menús
usan superficie, borde de línea y sombra de tarjeta. El fondo del modal usa
`primario` con opacidad, sin añadir colores. Las insignias reutilizan aviso,
peligro, estado-cerrado y éxito como texto; los roles usan texto-suave.
No se necesitan tokens nuevos.

```html
<app-selector identificador="rol" etiqueta="Rol" [opciones]="roles" formControlName="roleCode" />
<app-campo-fecha
  identificador="vencimiento"
  etiqueta="Fecha de vencimiento"
  formControlName="expiresAt"
/>
```

Consulta los [flujos de administración](pantallas-administracion.md) para las
reglas de cuenta temporal, confirmaciones y tratamiento de la clave.

## Galería y producción

Con `npm start`, abre http://localhost:4200/guia-ui. Incluye la paleta completa,
botones, íconos, campos, insignias, filtros, alertas, tarjetas y los componentes
de administración (listas adaptables, paginación, acciones directas, diálogos, confirmaciones y avisos). No exige una
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
  se abren con el botón y se recorren con flechas, Home y End;
  Tab y Escape los cierran. Hay un enlace para saltar al contenido.
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
Las listas de Usuarios y Categorías se adaptan sin scroll horizontal:
por debajo de `xl` (1280 px) cada registro apila sus datos en dos columnas de metadata,
etiquetas visibles y campos principales de ancho completo. Desde `xl` se muestra
la rejilla tabular y sus encabezados. `fila-responsive`, `campo-principal` y
`etiqueta-celda` comparten el patrón con un solo DOM; las filas usan
`class="fila-responsive grid"` para conservar la rejilla sobre el display del contenedor; las columnas desktop llegan
por `--columnas` desde `app-tabla-paginada`. Los valores largos pueden envolver.
Filtros y paginación también envuelven; no se oculta información en móvil.

Tickets, categorías y usuarios consumen sus APIs reales. Tickets incorpora
paginación, filtros en la URL y modal de creación; mantiene registros planos,
etiquetas semánticas y descripción en texto plano. Reportes consume métricas
reales; sus tablas apilan las métricas por fila en móvil, sin scroll lateral. Consulta [los flujos de tickets](tickets.md).

Las diferencias intencionales respecto del PDF son los SVG propios, Figtree,
los tamaños y radios semánticos pedidos, la paginación y las opciones
funcionales de sesión. Se usa un botón sólido de marca, sin degradados ni
sombras fuertes. El responsive prioriza filtros, registros legibles y acciones accesibles.

La referencia visible de tickets es `TK-XXXXXX` (mínimo seis dígitos, sin
truncamiento), enviada por la API. El logo y la marca siguen siendo HelpDesk.
El PDF de dos páginas sigue siendo válido como referencia de login, filas,
colores y estados; sus datos son ilustrativos, no contratos ni permisos. No
incluye todos los filtros, paginación, modales ni el detalle real implementados.

## Insignias de prioridad

`app-insignia-prioridad` recibe `prioridad` (TicketPriority: baja, media, alta,
urgente) y muestra su etiqueta en español con peso semibold. Reutiliza `info`
para Baja, `texto-suave` para Media, `aviso` para Alta y `peligro` para Urgente.
No lleva fondo, borde ni radio, y no agrega colores ni tokens.
Está disponible en la guía de desarrollo, listado y detalle. El selector y botón
de edición siguen rounded-boton; la disponibilidad depende del permiso de soporte
y del estado del ticket, sin concederlo por propiedad.

## Acciones, confirmaciones y avisos

Usuarios y Categorías usan `app-acciones-fila`, con botones iconográficos visibles,
`aria-label` y `title` que incluyen el nombre del registro. `app-boton` admite
`soloIcono`, `iconoPeligro`, `etiquetaAccesible` y `ayuda`; el área de pulsación es de al menos
44 × 44 px. `app-menu-acciones` sigue disponible para agrupaciones que realmente
lo necesiten, pero no se usa en estas dos listas ni en la guía.

Desactivar, restablecer contraseña y las operaciones sensibles existentes requieren
`app-confirmacion`; editar, filtrar, cambiar prioridad y abrir Telegram siguen
siendo directos. Cerrar sesión confirma en el shell y en el cambio obligatorio de
contraseña, con «Volver» y «Cerrar sesión». Cancelar conserva la sesión y retorna
el foco. El modal mantiene bloqueo del fondo y foco atrapado.

`app-aviso-flotante` usa superficie neutra, borde de línea y sombra de tarjeta.
Un icono semántico de éxito/error acompaña título y mensaje; el cierre es un botón
X con «Cerrar notificación». La región `status` anuncia el resultado y el aviso
se retira a los seis segundos. En móvil ocupa el ancho disponible con márgenes.
No añade animaciones ni cambia la preferencia de movimiento reducido.
Los colores de texto de estados, prioridades y cuentas superan 4.5:1 sobre
superficie, fondo y superficie-suave; el mínimo de la paleta actual es 5.45:1.

La imagen adjunta es un enlace nativo accesible por teclado a su Blob, con foco
visible y apertura segura en otra pestaña; no lleva un enlace de texto duplicado.
El contacto Telegram conserva texto y añade el SVG local `telegram`.

## Lista y vista previa de tickets

Desde `lg` (1024 px), Tickets usa dos paneles: lista compacta con filtros a la
izquierda y panel de trabajo a la derecha. La selección tiene borde primario,
fondo suave y `aria-pressed`, sin pastillas nuevas ni sombras fuertes. La vista
previa agrupa encabezado, metadatos, acciones y Detalles/Actividad. Comparte
lógica con el detalle y ofrece un enlace explícito para abrirlo completo.

Bajo `lg` solo se muestra lista o vista previa; el botón «Volver a la lista»
conserva el contexto y devuelve el foco. No se montan dos versiones del listado.
Reportes también usa `lg` para pasar de métricas apiladas a tablas; etiquetas
visibles en móvil sustituyen la necesidad de desplazar columnas horizontalmente.

Las acciones iconográficas de peligro usan el botón fantasma: fondo transparente
o neutro al pasar el puntero y solo `app-icono` con `text-peligro`. La variante
sólida de peligro se conserva para confirmar operaciones destructivas en diálogos.
`aria-label`, `title`, foco visible y áreas de 44 × 44 px permanecen vigentes.

## Filas de datos continuas

Las colecciones tabulares usan una superficie común con encabezados y divisores
horizontales de 1 px (`linea`). Cada registro tiene padding, pero no fondo propio,
sombra, borde completo ni radio. El contenedor puede conservar borde exterior y
`rounded-boton`; la última fila no duplica el borde inferior.

`app-tabla-paginada` agrupa las filas de Usuarios, Categorías y el ejemplo de la
guía mediante `divide-y divide-linea`. Cada fila es un elemento con `role="row"`
y celdas existentes; no usa `app-tarjeta`. `fila-responsive` mantiene dos columnas
apiladas en móvil, sin separaciones exteriores. Desde `xl`, reduce el padding
vertical a 8 px por lado; con acciones de 44 px, una fila simple mide unos 60 px.
Las cuentas temporales o textos largos pueden necesitar más altura. El hover
usa `superficie-suave`, sin sombra, y el foco permanece en cada control.

Tickets conserva su vista dividida y la lista continua con selección lateral.
Evolución y Actividad por agente ya usan filas planas; sus layouts apilados en
móvil permanecen. KPIs, formularios, modales, paneles, notas y notificaciones
conservan sus contenedores cuando representan unidades independientes.
