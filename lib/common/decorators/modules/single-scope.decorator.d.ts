import 'reflect-metadata';
/**
 * Makes the module single-scoped (not singleton).
 * In this case, Nest will always create a new instance of this particular module when it's imported by another one.
 */
export declare function SingleScope(): ClassDecorator;
