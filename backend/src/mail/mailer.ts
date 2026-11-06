import { createTransport } from 'nodemailer';
import type { MailConfig } from './config.js';

export interface RecoveryNotice {
  id: string;
  fullName: string;
  email: string;
}
export const recoverySubject = 'HelpDesk · Solicitud de recuperación de acceso';
export function createMailer(config: MailConfig) {
  const transporter = createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: config.requireTLS,
    ...(config.user && config.password
      ? { auth: { user: config.user, pass: config.password } }
      : {}),
    tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2' },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    logger: false,
    debug: false,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  return {
    async check(): Promise<void> {
      await transporter.verify();
    },
    async sendRecoveryNotice(account: RecoveryNotice): Promise<void> {
      await transporter.sendMail({
        from: config.from,
        to: config.recoveryAdminEmail,
        subject: recoverySubject,
        text: [
          'Se recibió una solicitud de recuperación de acceso en HelpDesk.',
          '',
          `Usuario: ${account.fullName}`,
          `Correo: ${account.email}`,
          '',
          'La cuenta utiliza acceso local.',
          '',
          'Para continuar:',
          '1. Inicia sesión en HelpDesk como administrador.',
          '2. Abre Usuarios.',
          '3. Busca esta cuenta.',
          '4. Comprueba la identidad por el procedimiento autorizado y revisa que corresponda atender la solicitud.',
          '5. Utiliza "Restablecer contraseña" si procede, o "Desbloquear" si solo requiere desbloqueo.',
          '6. Entrega la contraseña temporal al usuario por un medio distinto del correo.',
          '',
          'La solicitud por sí sola no modifica la cuenta ni acredita la identidad de quien la envía.',
          '',
          'Si no reconoces esta solicitud, no realices cambios.',
        ].join('\n'),
      });
    },
    close() {
      transporter.close();
    },
  };
}
