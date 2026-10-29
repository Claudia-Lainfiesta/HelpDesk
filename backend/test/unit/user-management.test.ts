import { randomBytes } from 'node:crypto';
import { expect, it, vi } from 'vitest';
import { parseUserConfig } from '../../src/users/config.js';
import { recordAudit } from '../../src/audit/audit.js';

it('valida los plazos de cuentas temporales y su relación', () => {
  expect(parseUserConfig({})).toEqual({ tempAccountDefaultDays: 7, tempAccountMaxDays: 30 });
  expect(
    parseUserConfig({ TEMP_ACCOUNT_DEFAULT_DAYS: '2', TEMP_ACCOUNT_MAX_DAYS: '3' })
      .tempAccountDefaultDays,
  ).toBe(2);
  for (const source of [
    { TEMP_ACCOUNT_DEFAULT_DAYS: '0' },
    { TEMP_ACCOUNT_MAX_DAYS: '-1' },
    { TEMP_ACCOUNT_DEFAULT_DAYS: '31' },
    { TEMP_ACCOUNT_MAX_DAYS: 'abc' },
  ]) {
    expect(() => parseUserConfig(source)).toThrow('TEMP_ACCOUNT_DEFAULT_DAYS');
  }
});

it('la auditoría rechaza metadatos no permitidos sin incluir su valor en el error', async () => {
  const secret = randomBytes(32).toString('base64url');
  const client = { query: vi.fn() };
  const event = {
    actor: null,
    action: 'users.created' as const,
    targetType: 'user' as const,
    targetId: '1',
  };
  for (const metadata of [
    { password: secret },
    { token: secret },
    { password_hash: secret },
    { role: secret },
    { changedFields: [secret] },
    { notes: secret },
  ]) {
    await expect(recordAudit(client, { ...event, metadata: metadata as never })).rejects.toThrow(
      'Metadatos de auditoría no permitidos.',
    );
  }
  expect(client.query).not.toHaveBeenCalled();
});
