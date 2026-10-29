import { randomBytes } from 'node:crypto';
import { parseOptions } from '@node-rs/argon2';
import { expect, it } from 'vitest';
import { hashPassword, validatePasswordPolicy, verifyPassword } from '../../src/auth/password.js';

it('Argon2id verifica y no incluye el secreto; cada hash tiene sal independiente', async () => {
  const password = randomBytes(24).toString('base64url');
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  expect(first.includes(password)).toBe(false);
  expect(first === second).toBe(false);
  expect(await verifyPassword(first, password)).toBe(true);
  expect(await verifyPassword(first, randomBytes(24).toString('base64url'))).toBe(false);
  expect(parseOptions(first)).toMatchObject({
    algorithm: 2,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
  expect(await verifyPassword(null, password)).toBe(false);
  expect(await verifyPassword('invalido', password)).toBe(false);
});

it('la política admite 10 a 128 caracteres sin composición y rechaza el correo', () => {
  const email = 'persona@example.invalid';
  expect(() => validatePasswordPolicy('a'.repeat(9), email)).toThrow('entre 10 y 128');
  expect(() => validatePasswordPolicy('a'.repeat(129), email)).toThrow('entre 10 y 128');
  expect(() => validatePasswordPolicy(email.toUpperCase(), email)).toThrow('distinta del correo');
  expect(() => validatePasswordPolicy('a'.repeat(10), email)).not.toThrow();
  expect(() => validatePasswordPolicy(' '.repeat(128), email)).not.toThrow();
  expect(() => validatePasswordPolicy('🔐'.repeat(128), email)).not.toThrow();
});
