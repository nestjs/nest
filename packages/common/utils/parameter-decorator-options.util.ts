import type { ParameterDecoratorOptions } from '../decorators/http/route-params.decorator.js';
import { isFunction } from './shared.utils.js';

const isPipeLike = (value: any): boolean =>
  isFunction(value?.transform) ||
  (isFunction(value) &&
    value.prototype &&
    isFunction(value.prototype.transform));

/**
 * Determines whether a parameter-decorator argument is a
 * `ParameterDecoratorOptions` object rather than a pipe (instance or class).
 *
 * Kept in one place so every decorator (`@Query`, `@Body`, `@Param`,
 * `@RawBody`, `@Payload`, `@MessageBody`, custom decorators, ...) classifies
 * arguments identically: a pipe instance that happens to expose a `schema` or
 * `pipes` property must never be mistaken for an options object.
 *
 * @internal
 */
export function isParameterDecoratorOptions(
  value: unknown,
): value is ParameterDecoratorOptions {
  return (
    !!value &&
    typeof value === 'object' &&
    !isPipeLike(value) &&
    ('schema' in value || 'pipes' in value)
  );
}
