export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0';
  
  // Use Bangladesh locale for Taka formatting if possible, otherwise standard
  return num.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  });
}

/**
 * Safely parse numeric input from forms or API
 */
export function parseAmount(value: any): number {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}
