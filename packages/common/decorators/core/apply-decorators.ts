/**
 * Function that returns a new decorator that applies all decorators provided by param
 *
 * Useful to build new decorators (or a decorator factory) encapsulating multiple decorators related with the same feature
 *
 * @param decorators one or more decorators (e.g., `ApplyGuard(...)`)
 *
 * @publicApi
 */
export function applyDecorators(
  ...decorators: Array<(target: object, ...params: any[]) => any>
): (target: object, ...params: any[]) => any {
  return (...params: [any]) => {
    for (const decorator of decorators || []) {
      decorator(...params);
    }
  };
}
