import { ArgumentsHost, ExceptionFilter, HttpServer } from '@nestjs/common';
export declare class BaseExceptionFilter<T = any> implements ExceptionFilter<T> {
    protected readonly applicationRef: HttpServer;
    private static readonly logger;
    constructor(applicationRef: HttpServer);
    catch(exception: T, host: ArgumentsHost): void;
    isExceptionObject(err: any): err is Error;
}
