/**
 * @param value currently processed route argument
 * @returns `true` if `value` is a valid number
 */
export function isNumeric(value: unknown): boolean {
  if (typeof value === 'number') return Number.isFinite(value);

  if (typeof value !== 'string' || value === '' || value !== value.trim()) {
    return false;
  }

  if (
    value.startsWith('0x') ||
    value.startsWith('0X') ||
    value.startsWith('0b') ||
    value.startsWith('0B') ||
    value.startsWith('0o') ||
    value.startsWith('0O')
  ) {
    return false;
  }

  return Number.isFinite(Number(value));
}
