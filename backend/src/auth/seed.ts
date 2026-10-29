import { randomBytes } from 'node:crypto';
import { readFile, writeFile, chmod } from 'node:fs/promises';
import type { Client } from 'pg';
import { hashPassword, validatePasswordPolicy } from './password.js';

const localFile = new URL('../../.seed-dev-password', import.meta.url);
const sampleEmails = [
  'ana.solicitante@helpdesk.local',
  'bruno.agente@helpdesk.local',
  'carla.supervisora@helpdesk.local',
  'diego.administrador@helpdesk.local',
];

export async function developmentSeedPassword(): Promise<string> {
  if (process.env.SEED_DEV_PASSWORD) return process.env.SEED_DEV_PASSWORD;
  try {
    return (await readFile(localFile, 'utf8')).trim();
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error;
  }
  const password = randomBytes(24).toString('base64url');
  try {
    await writeFile(localFile, password, { mode: 0o600, flag: 'wx' });
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'EEXIST') {
      return (await readFile(localFile, 'utf8')).trim();
    }
    throw error;
  }
  await chmod(localFile, 0o600);
  return password;
}

export async function seedDevelopmentPasswords(client: Client): Promise<void> {
  const password = await developmentSeedPassword();
  for (const email of sampleEmails) validatePasswordPolicy(password, email);
  // El seed no restablece contraseñas existentes ni invalida sesiones en una repetición.
  for (const email of sampleEmails) {
    const passwordHash = await hashPassword(password);
    await client.query(
      `UPDATE users SET password_hash = $1, must_change_password = false,
      password_changed_at = clock_timestamp() WHERE lower(email) = $2
      AND password_hash IS NULL`,
      [passwordHash, email],
    );
  }
}
