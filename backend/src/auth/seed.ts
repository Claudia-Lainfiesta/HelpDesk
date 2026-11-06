import { randomBytes } from 'node:crypto';
import { hashPassword, validatePasswordPolicy } from './password.js';
import { readFile, writeFile, chmod } from 'node:fs/promises';

const localFile = new URL('../../.seed-dev-password', import.meta.url);

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

export async function developmentSeedHash(password?: string): Promise<string> {
  const value = password ?? (await developmentSeedPassword());
  for (const email of [
    'ana.solicitante@helpdesk.local',
    'bruno.agente@helpdesk.local',
    'carla.supervisora@helpdesk.local',
    'diego.administrador@helpdesk.local',
    'auditoria.temporal@helpdesk.local',
  ])
    validatePasswordPolicy(value, email);
  return hashPassword(value);
}
