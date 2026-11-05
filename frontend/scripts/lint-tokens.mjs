import { readdir, readFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(fileURLToPath(new URL('../', import.meta.url)));
const paleta =
  '(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)';
const reglas = [
  [/#(?:[\da-f]{8}|[\da-f]{6}|[\da-f]{4}|[\da-f]{3})\b/gi, 'Color hexadecimal fuera de los tokens'],
  [/\b(?:rgba?|hsla?|oklch|oklab|lch|lab|hwb|color)\s*\(/gi, 'Color funcional fuera de los tokens'],
  [
    new RegExp(
      `\\b(?:${paleta}-\\d{2,3}|(?:bg|text|border|ring|outline|fill|stroke|shadow|from|via|to|decoration|divide|accent|caret)-(?:white|black))\\b`,
      'g',
    ),
    'Clase de paleta de Tailwind',
  ],
  [
    /\b(?:bg|text|border|ring|outline|fill|stroke|shadow|from|via|to|decoration|divide|accent|caret)-\[[^\]\r\n]*(?:#|(?:rgb|hsl|color|oklch)\(|(?:red|blue|white|black|purple|indigo|violet|fuchsia)\b)[^\]]*\]/gi,
    'Color arbitrario',
  ],
  [
    /\b(?:bg|fill|stroke)-\[[^\]]+\]|\b(?:text|border|ring|outline|shadow|from|via|to|decoration|divide|accent|caret)-\[(?![\d.])[^\]]+\]/gi,
    'Valor arbitrario sin etiqueta',
  ],
  [
    /\b(?:color|background(?:-color)?|border-color|fill|stroke)\s*:\s*(?:red|blue|white|black|purple|indigo|violet|fuchsia)\b/gi,
    'Color literal sin etiqueta',
  ],
  [/\p{Extended_Pictographic}|\p{Regional_Indicator}|\uFE0F|\u20E3/gu, 'Emoji no permitido'],
];

export async function revisarTokens(directorio = resolve(raiz, 'src')) {
  const errores = [];
  async function visitar(carpeta) {
    for (const entrada of await readdir(carpeta, { withFileTypes: true })) {
      const ruta = resolve(carpeta, entrada.name);
      if (entrada.isDirectory()) await visitar(ruta);
      else if (/\.(?:ts|html|css|scss|svg)$/.test(entrada.name)) {
        const contenido = await readFile(ruta, 'utf8');
        const esTokens = ruta === resolve(raiz, 'src/styles.css');
        contenido.split('\n').forEach((linea, indice) => {
          for (const [patron, mensaje] of reglas) {
            if (esTokens && mensaje !== 'Emoji no permitido') continue;
            patron.lastIndex = 0;
            if (patron.test(linea))
              errores.push(
                `${relative(raiz, ruta)}:${indice + 1}: ${mensaje}. Usa una etiqueta semántica.`,
              );
          }
        });
      }
    }
  }
  await visitar(directorio);
  return errores;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errores = await revisarTokens(process.argv[2] ? resolve(process.argv[2]) : undefined);
  if (errores.length) {
    console.error(errores.join('\n'));
    process.exitCode = 1;
  } else console.info('Tokens correctos: colores semánticos y sin emojis.');
}
