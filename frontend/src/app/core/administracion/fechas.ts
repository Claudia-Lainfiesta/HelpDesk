import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'fechaLocal', standalone: true })
export class FechaLocal implements PipeTransform {
  transform(valor: string | null | undefined): string {
    if (!valor) return 'Sin registro';
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return 'Fecha no disponible';
    return new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' }).format(fecha);
  }
}
export function fechaParaCampo(valor: string | null): string {
  if (!valor) return '';
  const fecha = new Date(valor);
  const local = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
export function fechaFutura(valor: string): boolean {
  return (
    !valor || (!Number.isNaN(new Date(valor).getTime()) && new Date(valor).getTime() > Date.now())
  );
}
