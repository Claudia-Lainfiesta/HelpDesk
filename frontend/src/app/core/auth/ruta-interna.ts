export function rutaInterna(valor: string | null | undefined): string {
  if (!valor) return '/tickets';
  try {
    const decodificada = decodeURIComponent(valor);
    if (
      !valor.startsWith('/') ||
      decodificada.startsWith('//') ||
      decodificada.includes('\\') ||
      Array.from(decodificada).some((caracter) => caracter.codePointAt(0)! <= 32)
    )
      return '/tickets';
    if (
      /^\/(?:iniciar-sesion|cambiar-contrasena|recuperar-contrasena)(?:[/?#]|$)/.test(decodificada)
    )
      return '/tickets';
    return valor;
  } catch {
    return '/tickets';
  }
}
