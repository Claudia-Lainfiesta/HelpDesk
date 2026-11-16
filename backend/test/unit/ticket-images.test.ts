import { readFile } from 'node:fs/promises';
import { expect, it, vi } from 'vitest';
vi.mock('../../src/db/pool.js', () => ({ pool: { query: vi.fn() } }));
import {
  detectImageMime,
  validateTicketImage,
  sanitizeImageFilename,
  imageDisposition,
  MAX_IMAGE_BYTES,
} from '../../src/tickets/attachments.js';
const fixture = (name: string) => readFile(new URL(`../fixtures/images/${name}`, import.meta.url));
it.each([
  ['valid.jpg', 'image/jpeg'],
  ['valid.png', 'image/png'],
  ['valid.webp', 'image/webp'],
])('detecta firma real de %s sin confiar en cliente', async (name, mime) => {
  expect(detectImageMime(await fixture(name))).toBe(mime);
});
it.each(['invalid.gif', 'invalid.pdf'])('no acepta %s', async (name) =>
  expect(detectImageMime(await fixture(name))).toBeUndefined(),
);
it('rechaza firmas truncadas y tamaños RIFF inconsistentes', async () => {
  for (const data of [
    Buffer.alloc(0),
    Buffer.from([255, 216, 255]),
    (await fixture('valid.png')).subarray(0, 8),
  ])
    expect(detectImageMime(data)).toBeUndefined();
  const webp = await fixture('valid.webp');
  webp.writeUInt32LE(webp.length + 100, 4);
  expect(detectImageMime(webp)).toBeUndefined();
});
it('sanea metadata de filename y no genera cabeceras inyectables', () => {
  const name = 'captura";\r\nX-Injected: sí\\/prueba.png';
  const sanitized = sanitizeImageFilename(name);
  expect(sanitized).not.toMatch(/[";\r\n\\/:]/);
  expect(imageDisposition(name)).toMatch(/^inline; filename="[\x20-\x7e]+"; filename\*=UTF-8''/);
  expect(imageDisposition(name)).not.toContain('\r');
  expect(imageDisposition(name)).not.toContain('\n');
  expect(sanitizeImageFilename('a'.repeat(300)).length).toBe(255);
});
it('valida límite exacto y no usa size declarado en lugar de bytes reales', async () => {
  const data = await fixture('valid.png');
  const file = {
    buffer: Buffer.concat([data, Buffer.alloc(MAX_IMAGE_BYTES - data.length)]),
    originalname: 'prueba.PNG',
    mimetype: 'image/png',
  } as Express.Multer.File;
  expect(validateTicketImage(file)?.data.length).toBe(MAX_IMAGE_BYTES);
  expect(() =>
    validateTicketImage({ ...file, buffer: Buffer.concat([file.buffer, Buffer.from([0])]) }),
  ).toThrow(expect.objectContaining({ code: 'IMAGE_TOO_LARGE' }));
});
