// La misma URI se usa en el pool, migraciones y herramientas, con TLS verificado
// en producción. pg admite sslrootcert en la URI si el proveedor requiere una CA.
export function databaseUrl(value: string, production: boolean): string {
  try {
    const url = new URL(value);
    if (
      !['postgres:', 'postgresql:'].includes(url.protocol) ||
      !url.hostname ||
      !url.username ||
      !url.password ||
      url.pathname.length <= 1 ||
      /[<>]/.test(value)
    )
      throw new Error();
    if (production) {
      const mode = url.searchParams.get('sslmode');
      if (mode && !['require', 'verify-full'].includes(mode)) throw new Error();
      if (['0', 'false'].includes(url.searchParams.get('ssl') ?? '')) throw new Error();
      url.searchParams.set('sslmode', 'verify-full');
    }
    return url.toString();
  } catch {
    throw new Error(
      'DATABASE_URL debe ser una URI PostgreSQL válida. En producción se exige TLS con verificación de certificado y hostname (sslmode=verify-full). Revisa .env.example sin compartir la URI.',
    );
  }
}
