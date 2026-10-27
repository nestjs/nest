/**
 * Marks a request whose pipes rejected it. A registered symbol, so packages
 * that cannot import this module (e.g. an upload interceptor in a platform
 * package of another version) can still read the marker.
 */
const REJECTED_BY_PIPES = Symbol.for('nestjs:rejected-by-pipes');

/**
 * Records that the pipes of `request` rejected it, so its route handler did
 * not run.
 */
export function markRejectedByPipes(request: unknown) {
  if (typeof request === 'object' && request !== null) {
    Object.defineProperty(request, REJECTED_BY_PIPES, {
      value: true,
      configurable: true,
    });
  }
}

/**
 * Whether the pipes of `request` rejected it, so its route handler did not
 * run. An interceptor can then release what it prepared for the handler,
 * e.g. the files an upload interceptor stored.
 */
export function isRejectedByPipes(request: unknown): boolean {
  return (
    typeof request === 'object' &&
    request !== null &&
    (request as Record<symbol, unknown>)[REJECTED_BY_PIPES] === true
  );
}
