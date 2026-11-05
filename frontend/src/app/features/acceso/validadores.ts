import {
  AbstractControl,
  FormControl,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';

export function validarCorreo(control: AbstractControl): ValidationErrors | null {
  const valor = String(control.value ?? '').trim();
  return valor ? Validators.email(new FormControl(valor)) : { required: true };
}
export function politicaContrasena(correo: () => string): ValidatorFn {
  return (control) => {
    const valor = String(control.value ?? '');
    const longitud = Array.from(valor).length;
    return longitud < 10 || longitud > 128 || valor.toLowerCase() === correo().toLowerCase()
      ? { politica: true }
      : null;
  };
}
export function confirmarContrasena(control: AbstractControl): ValidationErrors | null {
  const { actual, nueva, confirmacion } = control.value;
  const errores = {
    ...(nueva !== confirmacion ? { confirmacion: true } : {}),
    ...(actual && nueva === actual ? { repetida: true } : {}),
  };
  return Object.keys(errores).length ? errores : null;
}
