import { of } from 'rxjs';
import { NotificationsApi } from '../core/notificaciones/notificaciones-api';
export const notificacionesSinRed = {
  provide: NotificationsApi,
  useValue: {
    contador: () => of({ count: 0 }),
    listar: () => of({ items: [], pagination: { page: 1, pageSize: 20, total: 0 } }),
  },
};
