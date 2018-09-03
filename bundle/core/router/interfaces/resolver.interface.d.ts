import { HttpServer } from '@nestjs/common';

export interface Resolver {
    resolve(instance: HttpServer, basePath: string): any;
    registerNotFoundHandler(): any;
    registerExceptionHandler(): any;
}
