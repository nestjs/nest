export interface Resolver {
    resolve(instance: any, basePath: string): any;
}
