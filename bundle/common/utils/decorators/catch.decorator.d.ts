import 'reflect-metadata';
/**
 * Defines the Exceptions Filter. Takes set of exception types as an argument, which has to be catched by this Filter.
 * The class should implements the `ExceptionFilter` interface.
 */
export declare function Catch(...exceptions: any[]): ClassDecorator;
