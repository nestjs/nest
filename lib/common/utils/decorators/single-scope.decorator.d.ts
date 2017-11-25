import 'reflect-metadata';
/**
 * Makes the module single-scoped (not singleton).
 * Nest will always create the new instance of the module, when it's imported by another one.
 */
export declare function SingleScope(): ClassDecorator;
