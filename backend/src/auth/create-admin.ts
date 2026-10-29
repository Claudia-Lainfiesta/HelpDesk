import { createInterface, emitKeypressEvents } from 'node:readline';
import { stdin, stdout } from 'node:process';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { ApiError } from './errors.js';
import { hashPassword, validatePasswordPolicy } from './password.js';
import { emailSchema } from './routes.js';

async function hiddenPassword(prompt: string): Promise<string> {
  emitKeypressEvents(stdin);
  stdin.setRawMode(true);
  return new Promise((resolve, reject) => {
    let value = '';
    const done = () => {
      stdin.off('keypress', onKey);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write('\n');
    };
    const onKey = (text: string | undefined, key: { name?: string; ctrl?: boolean }) => {
      if (key.ctrl && key.name === 'c') {
        done();
        reject(new ApiError(400, 'CANCELLED', 'Operación cancelada.'));
      } else if (key.name === 'return' || key.name === 'enter') {
        done();
        resolve(value);
      } else if (key.name === 'backspace') value = Array.from(value).slice(0, -1).join('');
      else if (text && !key.ctrl) value += text;
    };
    stdin.on('keypress', onKey);
    stdout.write(prompt);
    stdin.resume();
  });
}

async function main(): Promise<void> {
  if (process.argv.length > 2 || !stdin.isTTY || !stdout.isTTY) {
    throw new ApiError(
      400,
      'INTERACTIVE_REQUIRED',
      'Ejecuta user:create-admin en una terminal interactiva y sin argumentos. La contraseña solo se acepta con entrada oculta.',
    );
  }
  const terminal = createInterface({ input: stdin, output: stdout });
  const question = (prompt: string) =>
    new Promise<string>((resolve) => terminal.question(prompt, resolve));
  let email: string;
  let fullName: string;
  try {
    const parsedEmail = emailSchema.safeParse(await question('Correo: '));
    const parsedName = z
      .string()
      .trim()
      .min(1)
      .max(200)
      .safeParse(await question('Nombre completo: '));
    if (!parsedEmail.success || !parsedName.success)
      throw new ApiError(400, 'INVALID_INPUT', 'Revisa el correo y el nombre completo.');
    email = parsedEmail.data;
    fullName = parsedName.data;
  } finally {
    terminal.close();
  }
  const password = await hiddenPassword('Contraseña (entrada oculta): ');
  const confirmation = await hiddenPassword('Repite la contraseña (entrada oculta): ');
  if (password !== confirmation)
    throw new ApiError(400, 'INVALID_INPUT', 'Las contraseñas no coinciden.');
  validatePasswordPolicy(password, email);
  const passwordHash = await hashPassword(password);
  const role = await pool.query<{ id: number }>(
    "SELECT id FROM roles WHERE code = 'administrador'",
  );
  if (!role.rows[0])
    throw new ApiError(
      400,
      'MIGRATIONS_REQUIRED',
      'Aplica las migraciones antes de crear el administrador.',
    );
  try {
    await pool.query(
      `INSERT INTO users (full_name, email, role_id, password_hash, must_change_password, password_changed_at)
      VALUES ($1, $2, $3, $4, false, clock_timestamp())`,
      [fullName, email, role.rows[0].id, passwordHash],
    );
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
      throw new ApiError(409, 'EMAIL_EXISTS', 'El correo ya existe.');
    }
    throw error;
  }
  console.info('Administrador creado.');
}

try {
  await main();
} catch (error) {
  console.error(error instanceof ApiError ? error.message : 'No se pudo crear el administrador.');
  process.exitCode = 1;
} finally {
  await pool.end();
}
