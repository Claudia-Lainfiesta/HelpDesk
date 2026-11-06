import type { RecoveryNotice } from '../../mail/mailer.js';

export function scheduleRecoveryNotice(
  account: RecoveryNotice,
  send: (account: RecoveryNotice) => Promise<void>,
): void {
  setImmediate(() => {
    // Promise.resolve captura también un fallo síncrono de la pasarela.
    void Promise.resolve()
      .then(() => send(account))
      .then(
        () => {
          console.info('mail.recovery_delivery', { userId: account.id, result: 'sent' });
        },
        () => {
          console.warn('mail.recovery_delivery', { userId: account.id, result: 'failed' });
        },
      );
  });
}
