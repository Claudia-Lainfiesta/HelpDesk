import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { parseTelegramEnv } from './telegram-env.js';
import { parseAuthConfig } from '../auth/config.js';
import { parseMailConfig } from '../mail/config.js';
import { parseUserConfig } from '../users/config.js';
import { databaseUrl as parseDatabaseUrl } from './database.js';

// La ruta funciona desde src/ y dist/, independientemente del directorio de ejecución.
if (process.env.NODE_ENV !== 'production')
  dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

function required(name: string, fallback?: string): string {
  const value = (process.env[name] ?? fallback)?.trim();
  if (!value) {
    throw new Error(`Configuración inválida: falta la variable ${name}. Revisa backend/.env.`);
  }
  return value;
}

function httpOrigin(value: string): string {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== value) {
      throw new Error();
    }
    return value;
  } catch {
    throw new Error(
      'FRONTEND_ORIGIN debe ser un origen HTTP(S) sin ruta, por ejemplo http://localhost:4200.',
    );
  }
}

const portValue = required('PORT', '3000');
const port = Number(portValue);
if (!/^\d+$/.test(portValue) || !Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT debe ser un número entero entre 1 y 65535.');
}

const nodeEnv = required('NODE_ENV', 'development');
if (!['development', 'test', 'production'].includes(nodeEnv)) {
  throw new Error('NODE_ENV debe ser development, test o production.');
}
const databaseUrl = parseDatabaseUrl(required('DATABASE_URL'), nodeEnv === 'production');
const frontendOrigin = httpOrigin(
  required('FRONTEND_ORIGIN', nodeEnv === 'production' ? undefined : 'http://localhost:4200'),
);
if (nodeEnv === 'production' && !frontendOrigin.startsWith('https://'))
  throw new Error(
    'FRONTEND_ORIGIN debe ser el origen HTTPS público en producción, sin ruta ni barra final.',
  );

export const env = Object.freeze({
  port,
  host: nodeEnv === 'production' ? '0.0.0.0' : '127.0.0.1',
  frontendOrigin,
  databaseUrl,
  nodeEnv,
  telegram: parseTelegramEnv(process.env),
  ...parseAuthConfig(process.env),
  ...parseUserConfig(process.env),
  mail: parseMailConfig(process.env),
});
