import { HttpErrorResponse } from '@angular/common/http';

export class FalloApi extends Error {
  constructor(
    readonly estado: number,
    readonly codigo: string,
    mensaje: string,
  ) {
    super(mensaje);
  }
}
export function interpretarError(error: unknown): FalloApi {
  if (error instanceof FalloApi) return error;
  if (error instanceof HttpErrorResponse) {
    const detalle: unknown = error.error?.error;
    if (
      typeof detalle === 'object' &&
      detalle !== null &&
      'code' in detalle &&
      'message' in detalle &&
      typeof detalle.code === 'string' &&
      typeof detalle.message === 'string'
    )
      return new FalloApi(error.status, detalle.code, detalle.message);
    return new FalloApi(
      error.status,
      'ERROR_API',
      error.status === 0
        ? 'No pudimos conectar con el servidor. Intenta de nuevo.'
        : 'No pudimos completar la operación. Intenta de nuevo.',
    );
  }
  return new FalloApi(0, 'ERROR_API', 'No pudimos completar la operación. Intenta de nuevo.');
}
