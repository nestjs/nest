import 'reflect-metadata';
import { FILTER_CATCH_EXCEPTIONS } from '../../constants';
import { Type } from '../../interfaces';

/**
 * Defines the Exceptions Filter. Takes set of exception types as an argument which has to be caught by this Filter.
 * The class should implement the `ExceptionFilter` interface.
 */
export function Catch(...exceptions: Type<any>[]): ClassDecorator {
  return (target: object) => {
    Reflect.defineMetadata(FILTER_CATCH_EXCEPTIONS, exceptions, target);
  };
}
