import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AltaCategoria, Categoria } from './modelos';

@Injectable({ providedIn: 'root' })
export class CategoriasApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/categories`;
  listar(includeInactive = false) {
    return this.http.get<{ data: Categoria[] }>(this.base, {
      params: new HttpParams().set('includeInactive', String(includeInactive)),
    });
  }
  crear(datos: AltaCategoria) {
    return this.http.post<Categoria>(this.base, datos);
  }
  editar(id: string, datos: Partial<AltaCategoria>) {
    return this.http.patch<Categoria>(`${this.base}/${encodeURIComponent(id)}`, datos);
  }
}
