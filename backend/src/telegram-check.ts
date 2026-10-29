import { loadTelegramEnv, requireTelegramToken } from './config/telegram-env.js';
import {
  checkTelegram,
  createTelegramApi,
  describeTelegramFailure,
  TelegramRuntimeError,
} from './integrations/telegram/runtime.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== '--delete-webhook')) {
    throw new TelegramRuntimeError('Uso: npm run telegram:check [-- --delete-webhook].');
  }
  const api = createTelegramApi(requireTelegramToken(loadTelegramEnv()));
  await checkTelegram(api, args.includes('--delete-webhook'));
}

main().catch((error: unknown) => {
  console.error(describeTelegramFailure(error));
  process.exitCode = 1;
});
