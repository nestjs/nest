import 'reflect-metadata';
import { FILTER_CATCH_EXCEPTIONS } from '../../constants';
import { Type } from '../../interfaces';
import { isNil } from '../../utils/shared.utils';
import { InvalidDecoratorItemException } from '../../utils/validate-each.util';

/**
 * Defines the Exceptions Filter. Takes set of exception types as an argument which has to be caught by this Filter.
 * The class should implement the `ExceptionFilter` interface.
 */
export function Catch(...exceptions: Type<any>[]): ClassDecorator {
  const validateNil = item => {
    if (isNil(item)) {
      throw new InvalidDecoratorItemException('@Catch', `value (${item})`, 'runtime exception');
    }
  };
  exceptions.forEach(validateNil);
  return (target: object) => {
    Reflect.defineMetadata(FILTER_CATCH_EXCEPTIONS, exceptions, target);
  };
}
