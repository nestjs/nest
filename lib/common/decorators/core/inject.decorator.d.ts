import 'reflect-metadata';
/**
 * Injects provider, which has to be available in the current injector (module) scope.
 * Providers are recognized by types / or tokens.
 */
export declare function Inject(token: any): ParameterDecorator;
