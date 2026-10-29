import { loadTelegramEnv, requireTelegramToken } from './config/telegram-env.js';
import { AbortController } from 'abort-controller';
import { createTelegramBot } from './integrations/telegram/bot.js';
import { describeTelegramFailure, runLongPolling } from './integrations/telegram/runtime.js';

async function main(): Promise<void> {
  const config = loadTelegramEnv();
  const bot = createTelegramBot({
    token: requireTelegramToken(config),
    allowedUserIds: config.allowedUserIds,
  });
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  try {
    await runLongPolling(bot, controller.signal);
  } catch (error) {
    if (!controller.signal.aborted) throw error;
  } finally {
    process.off('SIGINT', stop);
    process.off('SIGTERM', stop);
    console.info('Bot detenido. Las sesiones en memoria se descartaron.');
  }
}

main().catch((error: unknown) => {
  console.error(describeTelegramFailure(error));
  process.exitCode = 1;
});
