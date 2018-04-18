import 'reflect-metadata';
/**
 * Injects component, which has to be available in the current injector (module) scope.
 * Components are recognized by types / or tokens.
 */
export declare function Inject(token: any): ParameterDecorator;
