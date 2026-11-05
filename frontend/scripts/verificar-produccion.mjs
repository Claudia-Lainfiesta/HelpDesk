import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const carpeta = fileURLToPath(new URL('../dist/HelpDesk/browser/', import.meta.url));
try {
  await readFile(resolve(carpeta, 'index.html'));
  const archivos = await readdir(carpeta);
  for (const archivo of archivos.filter((nombre) => /\.(js|html)$/.test(nombre))) {
    const contenido = await readFile(resolve(carpeta, archivo), 'utf8');
    if (contenido.includes('guia-ui') || contenido.includes('Guía de interfaz'))
      throw new Error('La guía de desarrollo no debe formar parte de producción.');
  }
  console.info('Producción verificada: sin ruta ni código de la guía de desarrollo.');
} catch {
  console.error(
    'No se pudo verificar producción. Ejecuta npm run build y comprueba que no contiene la guía de desarrollo.',
  );
  process.exitCode = 1;
}
