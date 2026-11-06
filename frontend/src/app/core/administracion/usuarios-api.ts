import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  AltaCuenta,
  CambioCuenta,
  Cuenta,
  CuentaConClave,
  FiltrosUsuarios,
  Pagina,
} from './modelos';

@Injectable({ providedIn: 'root' })
export class UsuariosApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/users`;
  listar(filtros: FiltrosUsuarios) {
    let params = new HttpParams();
    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor !== undefined && valor !== '') params = params.set(clave, String(valor));
    }
    return this.http.get<Pagina<Cuenta>>(this.base, { params });
  }
  consultar(id: string) {
    return this.http.get<Cuenta>(`${this.base}/${encodeURIComponent(id)}`);
  }
  crear(datos: AltaCuenta) {
    return this.http.post<CuentaConClave>(this.base, datos);
  }
  editar(id: string, datos: CambioCuenta) {
    return this.http.patch<Cuenta>(`${this.base}/${encodeURIComponent(id)}`, datos);
  }
  desactivar(id: string) {
    return this.accion(id, 'deactivate');
  }
  reactivar(id: string) {
    return this.accion(id, 'reactivate');
  }
  desbloquear(id: string) {
    return this.accion(id, 'unlock');
  }
  restablecerClave(id: string) {
    return this.accion(id, 'reset-password');
  }
  private accion(id: string, accion: string) {
    return this.http.post<CuentaConClave>(`${this.base}/${encodeURIComponent(id)}/${accion}`, {});
  }
}
