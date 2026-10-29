import { randomBytes } from 'node:crypto';
import { Algorithm, hash, hashSync, verify } from '@node-rs/argon2';
import { ApiError } from './errors.js';

export const passwordHashOptions = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
};

// Se prepara una vez al cargar el módulo, antes de atender solicitudes.
const dummyHash = hashSync(randomBytes(48).toString('base64url'), passwordHashOptions);

export function validatePasswordPolicy(password: string, email: string): void {
  const length = Array.from(password).length;
  if (length < 10 || length > 128) {
    throw new ApiError(
      400,
      'PASSWORD_POLICY',
      'La contraseña debe tener entre 10 y 128 caracteres.',
    );
  }
  if (password.toLowerCase() === email.trim().toLowerCase()) {
    throw new ApiError(400, 'PASSWORD_POLICY', 'La contraseña debe ser distinta del correo.');
  }
}

export function hashPassword(password: string): Promise<string> {
  return hash(password, passwordHashOptions);
}

export async function verifyPassword(
  storedHash: string | null,
  password: string,
): Promise<boolean> {
  try {
    const matches = await verify(storedHash ?? dummyHash, password);
    return storedHash !== null && matches;
  } catch {
    // Un hash ilegible tampoco permite autenticar y conserva el trabajo de verificación.
    await verify(dummyHash, password);
    return false;
  }
}
