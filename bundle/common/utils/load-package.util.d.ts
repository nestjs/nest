export declare class MissingRequiredDependencyException extends Error {
    constructor(name: string, context: string);
}
export declare function loadPackage(packageName: string, context: string): any;
