/**
 * Creates an error without capturing a stack trace, for exceptions Nest throws
 * itself where the stack would only hold framework frames (e.g. the 404 for an
 * unknown route). Capturing it is most of what creating the error costs.
 *
 * Leaves `Error.stackTraceLimit` alone when it is read-only, since assigning
 * it would throw.
 */
export function withoutStackTrace<T>(create: () => T): T {
  const descriptor = Object.getOwnPropertyDescriptor(Error, 'stackTraceLimit');
  if (!descriptor?.writable) {
    return create();
  }
  const { stackTraceLimit } = Error;
  Error.stackTraceLimit = 0;
  try {
    return create();
  } finally {
    Error.stackTraceLimit = stackTraceLimit;
  }
}
