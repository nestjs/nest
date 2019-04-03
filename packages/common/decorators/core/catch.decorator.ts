import { FILTER_CATCH_EXCEPTIONS } from '../../constants';
import { Type } from '../../interfaces';

/**
 * Defines an exception filter. Takes set of exception types as arguments which have to be caught by this filter.
 * The class should implement the `ExceptionFilter` interface.
 */
export function Catch(...exceptions: Type<any>[]): ClassDecorator {
  return (target: object) => {
    Reflect.defineMetadata(FILTER_CATCH_EXCEPTIONS, exceptions, target);
  };
}
