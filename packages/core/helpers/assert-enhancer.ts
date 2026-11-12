import { Logger } from '@nestjs/common';
import { isFunction, isObject } from '@nestjs/common/utils/shared.utils';
import { InvalidEnhancerException } from '../errors/exceptions/invalid-enhancer.exception';
import { INVALID_FILTER_MESSAGE } from '../errors/messages';

export type EnhancerKind = 'guard' | 'interceptor' | 'pipe';

const ENHANCER_METHODS: Record<EnhancerKind, string> = {
  guard: 'canActivate',
  interceptor: 'intercept',
  pipe: 'transform',
};

/**
 * Throws when the given value can't run as an enhancer of the given kind.
 * Such a value used to be dropped without an error, which left the handlers
 * it was bound to without it (e.g., unguarded).
 *
 * @param description what was bound, for the message (by default, the value)
 */
export function assertEnhancer(
  enhancer: unknown,
  kind: EnhancerKind,
  description = describeEnhancer(enhancer),
): void {
  const method = ENHANCER_METHODS[kind];
  if (enhancer && isFunction((enhancer as Record<string, unknown>)[method])) {
    return;
  }
  throw new InvalidEnhancerException(kind, method, description);
}

/**
 * Warns when the given value can't run as an exception filter. Unlike the
 * other enhancers, such a filter is still skipped rather than rejected: the
 * exceptions it was meant to handle get the default response, so no handler
 * runs without a check it relies on.
 *
 * @param description what was bound, for the message (by default, the value)
 */
export function warnOnInvalidFilter(
  filter: unknown,
  description = describeEnhancer(filter),
): void {
  // A promise has a "catch" method too, but is never a filter
  const isThenable = isFunction(
    (filter as PromiseLike<unknown> | undefined)?.then,
  );
  if (
    filter &&
    !isThenable &&
    isFunction((filter as Record<string, unknown>).catch)
  ) {
    return;
  }
  new Logger('ExceptionFilter').warn(INVALID_FILTER_MESSAGE(description));
}

export function describeEnhancer(value: unknown): string {
  if (isFunction(value)) {
    return value.name ? `class ${value.name}` : 'an anonymous class';
  }
  if (isFunction((value as PromiseLike<unknown> | undefined)?.then)) {
    return 'a promise';
  }
  if (Array.isArray(value)) {
    return 'an array';
  }
  if (isObject(value)) {
    const name = (value as object).constructor?.name;
    return name && name !== 'Object' ? `an instance of ${name}` : 'an object';
  }
  return String(value);
}
