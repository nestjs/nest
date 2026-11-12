const isBinary = (value: object) =>
  value instanceof ArrayBuffer ||
  ArrayBuffer.isView(value) ||
  (typeof Blob !== 'undefined' && value instanceof Blob);

/**
 * Whether a message refers to the same binary value (a Buffer, an ArrayBuffer
 * or a view of one, or a Blob) more than once, which no Socket.IO client
 * sends. A loop with a record of what it has seen, not recursion: the client
 * decides how deep the message is nested.
 */
export function hasRepeatedBinary(message: unknown): boolean {
  const pending: unknown[] = [message];
  const seen = new Set<object>();
  while (pending.length > 0) {
    const current = pending.pop();
    if (typeof current !== 'object' || current === null) {
      continue;
    }
    if (seen.has(current)) {
      if (isBinary(current)) {
        return true;
      }
      continue;
    }
    seen.add(current);
    if (isBinary(current)) {
      continue;
    }
    for (const item of Object.values(current)) {
      pending.push(item);
    }
  }
  return false;
}
