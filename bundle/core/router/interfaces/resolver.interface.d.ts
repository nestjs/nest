export interface Resolver {
    resolve(instance: any, basePath: string): any;
    registerNotFoundHandler(): any;
    registerExceptionHandler(): any;
}
