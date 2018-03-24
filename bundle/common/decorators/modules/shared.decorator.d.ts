import 'reflect-metadata';
/**
 * Specifies scope of this module. When module is `@Shared()`, Nest will create only one instance of this
 * module and share them between all of the modules.
 * @deprecated
 */
export declare const Shared: (scope?: string) => (target: any) => any;
