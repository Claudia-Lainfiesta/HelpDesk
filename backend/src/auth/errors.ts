export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const invalidCredentials = () =>
  new ApiError(401, 'INVALID_CREDENTIALS', 'Credenciales incorrectas');
export const authenticationRequired = () =>
  new ApiError(401, 'UNAUTHENTICATED', 'Debes iniciar sesión.');
