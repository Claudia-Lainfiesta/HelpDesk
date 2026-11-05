import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { revisarTokens } from './lint-tokens.mjs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('detecta colores crudos y acepta etiquetas en archivos temporales', async () => {
  const carpeta = await mkdtemp(join(tmpdir(), 'helpdesk-tokens-'));
  try {
    const archivo = join(carpeta, 'prueba.html');
    for (const contenido of [
      '<p style="color: #abcdef">',
      '<p class="bg-[#abcdef]">',
      '<p class="text-red-500">',
      '<p style="color: rgb(1,2,3)">',
      '<p class="bg-[rebeccapurple]">',
      String.fromCodePoint(0x1f680),
    ]) {
      await writeFile(archivo, contenido);
      const errores = await revisarTokens(carpeta);
      assert.ok(errores.length > 0);
      assert.ok(errores[0].includes('prueba.html:1:'));
      const proceso = spawnSync(
        process.execPath,
        [fileURLToPath(new URL('./lint-tokens.mjs', import.meta.url)), carpeta],
        { encoding: 'utf8' },
      );
      assert.equal(proceso.status, 1);
      assert.ok(proceso.stderr.includes('prueba.html:1:'));
    }
    await writeFile(
      archivo,
      '<p class="bg-primario text-sobre-primario border-linea text-estado-creado">',
    );
    assert.deepEqual(await revisarTokens(carpeta), []);
  } finally {
    await rm(carpeta, { recursive: true });
  }
});
