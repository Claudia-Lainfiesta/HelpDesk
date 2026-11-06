async function main() {
  const { mailer } = await import('./default.js');
  try {
    await mailer.check();
    console.info('SMTP: conexión y autenticación comprobadas. No se envió correo.');
  } finally {
    mailer.close();
  }
}
main().catch(() => {
  console.error(
    'SMTP: no se pudo comprobar la conexión. Revisa la configuración, TLS y la disponibilidad del servicio.',
  );
  process.exitCode = 1;
});
