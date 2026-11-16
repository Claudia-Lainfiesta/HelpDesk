import { ReportFilters } from './modelos';
export type Rango = '7' | '30' | '90' | 'personalizado';
export interface VistaReportes {
  range: Rango;
  from: string;
  to: string;
  categoryId: string;
  agentId: string;
}
export function fechaLocal(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function fechaValida(texto: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const [year, month, day] = texto.split('-').map(Number);
  const date = new Date(year!, month! - 1, day!);
  return year! >= 1000 && fechaLocal(date) === texto;
}
export function fechasRapidas(dias: number, now = new Date()) {
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dias + 1);
  return { from: fechaLocal(from), to: fechaLocal(now) };
}
export function rangoValido(from: string, to: string): boolean {
  if (!fechaValida(from) || !fechaValida(to) || from > to) return false;
  const days = (Date.parse(to) - Date.parse(from)) / 86400000 + 1;
  return days <= 365;
}
export function filtrosUtc(vista: VistaReportes): ReportFilters {
  const [y, m, d] = vista.from.split('-').map(Number);
  const [yy, mm, dd] = vista.to.split('-').map(Number);
  // Dos medianoches locales, sin sumar 24 h: respeta los cambios de horario.
  const from = new Date(y!, m! - 1, d!);
  const end = new Date(yy!, mm! - 1, dd! + 1);
  return {
    from: from.toISOString(),
    to: new Date(end.getTime() - 1).toISOString(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    ...(vista.categoryId ? { categoryId: vista.categoryId } : {}),
    ...(vista.agentId ? { agentId: vista.agentId } : {}),
  };
}
export function duracion(minutos: number | null): string {
  if (minutos === null) return 'Sin datos';
  let n = Math.max(0, Math.round(minutos));
  const dias = Math.floor(n / 1440);
  n %= 1440;
  const horas = Math.floor(n / 60),
    min = n % 60;
  return (
    [dias ? `${dias} d` : '', horas ? `${horas} h` : '', !dias && min ? `${min} min` : '']
      .filter(Boolean)
      .join(' ') || '0 min'
  );
}

export function fechaBucket(texto: string): string {
  const [y, m, d] = texto.split('-').map(Number);
  return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(y!, m! - 1, d!),
  );
}
