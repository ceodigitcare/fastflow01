/**
 * Currency utility functions to ensure consistent decimal precision
 * and formatting throughout the financial application
 */

/**
 * Format a number to exactly 2 decimal places for financial display
 * @param amount - The amount to format
 * @returns Formatted number with exactly 2 decimal places
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') {
    return '0.00';
  }
  
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numericAmount)) {
    return '0.00';
  }
  
  return numericAmount.toFixed(2);
}

/**
 * Parse and normalize a currency input to ensure 2 decimal precision
 * @param amount - The amount to normalize
 * @returns Number with exactly 2 decimal places
 */
export function normalizeCurrency(amount: number | string | null | undefined): number {
  if (amount === null || amount === undefined || amount === '') {
    return 0;
  }
  
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numericAmount)) {
    return 0;
  }
  
  return Number(numericAmount.toFixed(2));
}

/**
 * Format currency with dollar sign for display
 * @param amount - The amount to format
 * @returns Formatted currency string with $ prefix
 */
export function formatCurrencyDisplay(amount: number | string | null | undefined): string {
  return `$${formatCurrency(amount)}`;
}

/**
 * Validate if a currency amount is valid (positive and properly formatted)
 * @param amount - The amount to validate
 * @returns True if valid, false otherwise
 */
export function isValidCurrencyAmount(amount: number | string | null | undefined): boolean {
  if (amount === null || amount === undefined || amount === '') {
    return true; // Allow empty values
  }
  
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  return !isNaN(numericAmount) && numericAmount >= 0;
}

/**
 * Calculate percentage with proper decimal precision
 * @param part - The part value
 * @param total - The total value
 * @returns Percentage with 2 decimal places
 */
export function calculatePercentage(part: number, total: number): number {
  if (total === 0) return 0;
  return Number(((part / total) * 100).toFixed(2));
}