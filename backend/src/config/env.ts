import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

// La ruta funciona desde src/ y dist/, independientemente del directorio de ejecución.
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

const databaseUrl = required('DATABASE_URL');
try {
  const url = new URL(databaseUrl);
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !url.hostname ||
    !url.username ||
    !url.password ||
    url.pathname.length <= 1 ||
    /[<>]/.test(databaseUrl)
  ) {
    throw new Error();
  }
} catch {
  throw new Error(
    'DATABASE_URL debe ser una URL PostgreSQL válida con usuario, contraseña, servidor y base de datos.',
  );
}

const nodeEnv = required('NODE_ENV', 'development');
if (!['development', 'test', 'production'].includes(nodeEnv)) {
  throw new Error('NODE_ENV debe ser development, test o production.');
}

export const env = Object.freeze({
  port,
  frontendOrigin: httpOrigin(required('FRONTEND_ORIGIN', 'http://localhost:4200')),
  databaseUrl,
  postgresUser: required('POSTGRES_USER'),
  postgresPassword: required('POSTGRES_PASSWORD'),
  postgresDb: required('POSTGRES_DB', 'helpdesk'),
  nodeEnv,
});
