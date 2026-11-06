import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class RecuperacionApi {
  private readonly http = inject(HttpClient);
  solicitar(email: string) {
    return this.http.post<{ message: string }>(`${environment.apiBaseUrl}/auth/recovery-request`, {
      email: email.trim(),
    });
  }
}
