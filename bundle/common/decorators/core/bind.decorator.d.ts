/**
 * Binds parameters decorators to the particular method
 * Useful when the language doesn't provide a 'Parameter Decorators' feature (vanilla JavaScript)
 * @param  {} ...decorators
 */
export declare function Bind(...decorators: any[]): (target: object, key: any, descriptor: any) => any;
