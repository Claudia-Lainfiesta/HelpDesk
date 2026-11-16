import multer from 'multer';
import type { RequestHandler } from 'express';
import { extname } from 'node:path';
import { ApiError } from '../auth/errors.js';
import { pool } from '../db/pool.js';
import type { UserProfile } from '../auth/types.js';
import { findTicket } from './repository.js';

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export type ImageMime = 'image/jpeg' | 'image/png' | 'image/webp';
export interface TicketImage {
  fileName: string;
  mimeType: ImageMime;
  data: Buffer;
}

const upload = multer({
  storage: multer.memoryStorage(),
  // Busboy avisa al alcanzar el límite: un byte adicional permite aceptar exactamente 10 MiB.
  limits: {
    fileSize: MAX_IMAGE_BYTES + 1,
    files: 1,
    fields: 3,
    parts: 5,
    fieldSize: 24000,
    fieldNameSize: 100,
  },
}).single('image');
export const receiveTicketImage: RequestHandler = (req, res, next) => {
  upload(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      next(new ApiError(413, 'IMAGE_TOO_LARGE', 'La imagen no puede superar los 10 MB.'));
      return;
    }
    next(
      new ApiError(
        400,
        'INVALID_MULTIPART',
        'Envía solo subject, description, categoryId y como máximo una imagen.',
      ),
    );
  });
};

export function detectImageMime(data: Buffer): ImageMime | undefined {
  if (
    data.length >= 12 &&
    data[0] === 0xff &&
    data[1] === 0xd8 &&
    data[2] === 0xff &&
    data[data.length - 2] === 0xff &&
    data[data.length - 1] === 0xd9
  )
    return 'image/jpeg';
  if (
    data.length >= 33 &&
    data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
    data.readUInt32BE(8) === 13 &&
    data.toString('ascii', 12, 16) === 'IHDR' &&
    data.readUInt32BE(16) > 0 &&
    data.readUInt32BE(20) > 0
  )
    return 'image/png';
  if (
    data.length >= 20 &&
    data.toString('ascii', 0, 4) === 'RIFF' &&
    data.toString('ascii', 8, 12) === 'WEBP' &&
    data.readUInt32LE(4) + 8 === data.length &&
    ['VP8 ', 'VP8L', 'VP8X'].includes(data.toString('ascii', 12, 16)) &&
    data.readUInt32LE(16) > 0 &&
    data.readUInt32LE(16) + 20 <= data.length
  )
    return 'image/webp';
  return undefined;
}
export function sanitizeImageFilename(value: string): string {
  return (
    Array.from(value.normalize('NFC'))
      .map((char) => {
        const code = char.codePointAt(0)!;
        return code < 32 || (code >= 127 && code <= 159) || '"\\/:;<>'.includes(char) ? '_' : char;
      })
      .slice(0, 255)
      .join('')
      .trim() || 'imagen'
  );
}
export function validateTicketImage(file?: Express.Multer.File): TicketImage | undefined {
  if (!file) return undefined;
  if (file.buffer.length > MAX_IMAGE_BYTES)
    throw new ApiError(413, 'IMAGE_TOO_LARGE', 'La imagen no puede superar los 10 MB.');
  const mimeType = detectImageMime(file.buffer);
  const extensions: Record<ImageMime, readonly string[]> = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/webp': ['.webp'],
  };
  if (
    !mimeType ||
    file.mimetype !== mimeType ||
    !extensions[mimeType].includes(extname(file.originalname).toLowerCase())
  )
    throw new ApiError(
      400,
      'INVALID_IMAGE',
      'Solo puedes adjuntar imágenes JPG, JPEG, PNG o WebP con contenido, MIME y extensión coherentes.',
    );
  return { fileName: sanitizeImageFilename(file.originalname), mimeType, data: file.buffer };
}
export async function getTicketImage(id: string, user: UserProfile) {
  // Un solicitante ajeno obtiene el mismo 404 del detalle, tenga o no imagen.
  await findTicket(pool, id, user);
  const result = await pool.query<{
    original_filename: string;
    mime_type: ImageMime;
    size_bytes: number;
    data: Buffer;
  }>(
    'SELECT original_filename,mime_type,size_bytes,data FROM ticket_attachments WHERE ticket_id=$1',
    [id],
  );
  if (!result.rows[0])
    throw new ApiError(404, 'TICKET_ATTACHMENT_NOT_FOUND', 'Este ticket no tiene imagen adjunta.');
  return result.rows[0];
}
export function imageDisposition(filename: string): string {
  const safe = sanitizeImageFilename(filename);
  const ascii = Array.from(safe)
    .map((char) => (char.codePointAt(0)! > 126 ? '_' : char))
    .join('');
  const encoded = encodeURIComponent(safe).replace(
    /['()*]/g,
    (char) => '%' + char.charCodeAt(0).toString(16).toUpperCase(),
  );
  return `inline; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}
