export const PASSWORD_REQUIREMENTS = 'Mínimo 10 caracteres, con mayúscula, minúscula, número y símbolo.';

export const validateStrongPassword = (password: string): boolean => {
  return password.length >= 10
    && password.length <= 128
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /[0-9]/.test(password)
    && /[^A-Za-z0-9]/.test(password);
};
