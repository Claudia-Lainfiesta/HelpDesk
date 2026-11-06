import { recordAudit } from '../../audit/audit.js';
import { transaction } from '../../db/transaction.js';
import type { RecoveryNotice } from '../../mail/mailer.js';

export async function registerRecovery(email: string, ip?: string): Promise<RecoveryNotice | null> {
  return transaction(async (client) => {
    const result = await client.query<RecoveryNotice>(
      `SELECT id::text, full_name AS "fullName", email FROM users
       WHERE lower(email) = $1 AND auth_provider = 'local' AND is_active
         AND (expires_at IS NULL OR expires_at > clock_timestamp())`,
      [email],
    );
    const account = result.rows[0];
    if (!account) return null;
    await recordAudit(client, {
      actor: null,
      ip,
      action: 'auth.recovery_requested',
      targetType: 'user',
      targetId: account.id,
    });
    return account;
  });
}
