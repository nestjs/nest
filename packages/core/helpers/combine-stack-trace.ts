/**
 * Generates the full stack trace of an error, recursively including the stack
 * traces of its causes. An error may specify a cause by passing an object with
 * a `cause` property as the second argument to the `Error` constructor.
 *
 * @param error Error whose stack trace should be generated.
 * @returns A string representation of the error's stack trace.
 */
export function combineStackTrace(error: Error): string {
  let result = error.stack || '';
  let errorCause = getErrorCause(error);
  while (errorCause instanceof Error) {
    result += '\nCaused by ' + errorCause.stack;
    errorCause = getErrorCause(errorCause);
  }
  return result;
}

function getErrorCause(error: Error): unknown {
  // @ts-expect-error - Error.cause has been introduced in ES2022.
  return error.cause;
}
