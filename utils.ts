
export const getDeviceLocale = (): string => {
  return typeof navigator !== 'undefined' ? navigator.language : 'pt-BR';
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat(getDeviceLocale(), {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatDecimal = (value: number): string => {
  return new Intl.NumberFormat(getDeviceLocale(), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const parseBRL = (value: string): number => {
  // Removes R$, dots, replaces comma with dot
  // Note: This helper might be deprecated if we move to full locale support for parsing
  const cleanValue = value.replace(/[^\d,]/g, '').replace(',', '.');
  return parseFloat(cleanValue) || 0;
};

export const formatPlate = (value: string): string => {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
};

export const isValidPlate = (plate: string): boolean => {
  // Removes formatting chars just in case, though formatPlate usually handles input
  const clean = plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  if (clean.length !== 7) return false;

  // Regex Validation
  // Old Format: AAA9999 (3 Letters, 4 Numbers)
  const oldFormat = /^[A-Z]{3}[0-9]{4}$/;
  
  // Mercosul Format: AAA9A99 (3 Letters, 1 Number, 1 Letter, 2 Numbers)
  const mercosulFormat = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;

  return oldFormat.test(clean) || mercosulFormat.test(clean);
};

export const handlePriceChange = (value: string): number => {
  // Expects input like "1.200,50" or raw numbers
  // This helper is for controlled inputs
  const numbers = value.replace(/\D/g, "");
  return Number(numbers) / 100;
};

export const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
