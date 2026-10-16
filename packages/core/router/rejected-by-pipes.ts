const rejectedRequests = new WeakSet<object>();

/**
 * Records that the pipes of `request` rejected it, so its route handler did
 * not run.
 */
export function markRejectedByPipes(request: unknown) {
  if (typeof request === 'object' && request !== null) {
    rejectedRequests.add(request);
  }
}

/**
 * Whether the pipes of `request` rejected it, so its route handler did not
 * run. An interceptor can then release what it prepared for the handler,
 * e.g. the files an upload interceptor stored.
 */
export function isRejectedByPipes(request: unknown): boolean {
  return rejectedRequests.has(request as object);
}
