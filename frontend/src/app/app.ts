import { Component, DestroyRef, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { timeout } from 'rxjs';
import { environment } from '../environments/environment';

interface HealthResponse {
  status: 'ok';
  service: string;
  time: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly apiStatus = signal<'loading' | 'ok' | 'error'>('loading');
  protected readonly checkedAt = signal('');

  constructor() {
    this.checkHealth();
  }

  protected checkHealth(): void {
    this.apiStatus.set('loading');
    this.http.get<HealthResponse>(`${environment.apiBaseUrl}/health`)
      .pipe(timeout(5000), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (health) => {
          this.apiStatus.set(health.status === 'ok' ? 'ok' : 'error');
          this.checkedAt.set(new Date(health.time).toLocaleString('es-GT'));
        },
        error: () => this.apiStatus.set('error'),
      });
  }
}
