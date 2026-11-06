import { interpretarError } from '../auth/fallo-api';

export const erroresAdministracion: Record<string, { mensaje: string; campo?: string }> = {
  EMAIL_EXISTS: { mensaje: 'Ya existe una cuenta con ese correo.', campo: 'email' },
  INVALID_ROLE: { mensaje: 'Selecciona uno de los cuatro roles disponibles.', campo: 'roleCode' },
  INVALID_EXPIRATION: {
    mensaje: 'Revisa el vencimiento: debe ser futuro y respetar el plazo máximo de la cuenta.',
    campo: 'expiresAt',
  },
  TEMP_LOCAL_REQUIRED: {
    mensaje: 'Las cuentas temporales deben usar acceso local.',
    campo: 'authProvider',
  },
  TEMP_EXPIRY_REQUIRED: {
    mensaje: 'Esta cuenta temporal debe conservar una fecha de vencimiento.',
    campo: 'expiresAt',
  },
  SELF_DEACTIVATION: { mensaje: 'No puedes desactivar tu propia cuenta.' },
  SELF_ROLE_CHANGE: { mensaje: 'No puedes cambiar tu propio rol.', campo: 'roleCode' },
  SELF_PASSWORD_RESET: {
    mensaje: 'Para cambiar tu contraseña, usa Cambiar contraseña en tu menú.',
  },
  LAST_ADMINISTRATOR: {
    mensaje: 'Debe quedar otro administrador activo, con acceso local y sin vencimiento.',
  },
  DIRECTORY_ACCOUNT: {
    mensaje: 'La contraseña de esta cuenta se gestiona en el directorio corporativo.',
  },
  USER_NOT_FOUND: { mensaje: 'La cuenta ya no está disponible. Actualiza la lista.' },
  CATEGORY_EXISTS: { mensaje: 'Ya existe una categoría con ese nombre.', campo: 'name' },
  CATEGORY_NOT_FOUND: { mensaje: 'La categoría ya no está disponible. Actualiza la lista.' },
};
export function errorAdministracion(error: unknown) {
  const fallo = interpretarError(error);
  const conocido = erroresAdministracion[fallo.codigo];
  return {
    campo: conocido?.campo,
    // Conserva el mensaje del servidor, aunque amplíe un código conocido.
    mensaje:
      conocido && conocido.mensaje !== fallo.message
        ? `${conocido.mensaje} ${fallo.message}`
        : fallo.message,
  };
}
