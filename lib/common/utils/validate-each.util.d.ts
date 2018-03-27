import { RuntimeException } from '@nestjs/core/errors/exceptions/runtime.exception';
export declare class InvalidDecoratorItemException extends RuntimeException {
  constructor(decorator: string, item: string, context: string);
}
export declare function validateEach(
  context: {
    name: string;
  },
  arr: any[],
  predicate: Function,
  decorator: string,
  item: string,
): boolean;
