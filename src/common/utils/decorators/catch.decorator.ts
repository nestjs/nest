import 'reflect-metadata';
import {FILTER_CATCH_EXCEPTIONS} from '../../constants';

/**
 * Defines the Exceptions Filter. Takes set of exception types as an argument,
 * which has to be catched by this Filter. The class should implements the
 * `ExceptionFilter` interface.
 */
export function Catch(...exceptions): ClassDecorator {
  return (target: object) => {
    Reflect.defineMetadata(FILTER_CATCH_EXCEPTIONS, exceptions, target);
  };
}
