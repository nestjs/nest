/**
 * Binds parameters decorators to the method
 * Useful when the language doesn't provide a 'Parameter Decorators' feature
 * @param  {} ...decorators
 */
export declare function Bind(...decorators: any[]): (target: object, key: any, descriptor: any) => any;
