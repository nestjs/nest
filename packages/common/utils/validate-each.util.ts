import { RuntimeException } from '@nestjs/core/errors/exceptions/runtime.exception';

export class InvalidDecoratorItemException extends RuntimeException {
  constructor(decorator: string, item: string, context: string) {
    super(`Invalid ${item} passed to ${decorator}() decorator (${context}).`);
  }
}

export function validateEach(
  context: { name: string },
  arr: any[],
  predicate: Function,
  decorator: string,
  item: string,
): boolean {
  if (!context || !context.name) {
    return true;
  }
  const errors = arr.filter(str => !predicate(str));
  if (errors.length > 0) {
    throw new InvalidDecoratorItemException(decorator, item, context.name);
  }
  return true;
}
