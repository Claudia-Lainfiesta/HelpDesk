import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ReportFilters, ReportOptions, Reports } from './modelos';
@Injectable({ providedIn: 'root' })
export class ReportesApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/reports`;
  opciones() {
    return this.http.get<ReportOptions>(`${this.base}/options`);
  }
  cargar(filters: ReportFilters) {
    const params = this.parametros(filters);
    return forkJoin({
      summary: this.http.get<Reports['summary']>(`${this.base}/summary`, { params }),
      statuses: this.http.get<Reports['statuses']>(`${this.base}/by-status`, { params }),
      priorities: this.http.get<Reports['priorities']>(`${this.base}/by-priority`, { params }),
      categories: this.http.get<Reports['categories']>(`${this.base}/by-category`, { params }),
      trend: this.http.get<Reports['trend']>(`${this.base}/trend`, { params }),
      agents: this.http.get<Reports['agents']>(`${this.base}/by-agent`, { params }),
    });
  }
  exportar(filters: ReportFilters) {
    return this.http.get(`${this.base}/export.csv`, {
      params: this.parametros(filters),
      responseType: 'blob',
      observe: 'response',
    });
  }
  private parametros(filters: ReportFilters) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) if (value) params = params.set(key, value);
    return params;
  }
}
