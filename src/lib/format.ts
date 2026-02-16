// src/lib/format.ts

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatPhone(phone: string): string {
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');

  if (digitsOnly.length === 11) {
    // (XX) XXXXX-XXXX
    return digitsOnly.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  } else if (digitsOnly.length === 10) {
    // (XX) XXXX-XXXX
    return digitsOnly.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  } else if (digitsOnly.length === 9) {
    // XXXXX-XXXX (for local numbers without DDD)
    return digitsOnly.replace(/^(\d{5})(\d{4})$/, '$1-$2');
  } else if (digitsOnly.length === 8) {
    // XXXX-XXXX (for local numbers without DDD)
    return digitsOnly.replace(/^(\d{4})(\d{4})$/, '$1-$2');
  }
  // Return original if no suitable format is found
  return phone;
}
