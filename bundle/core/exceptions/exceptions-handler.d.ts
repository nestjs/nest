import { HttpException, HttpServer } from '@nestjs/common';
import { ExceptionFilterMetadata } from '@nestjs/common/interfaces/exceptions/exception-filter-metadata.interface';
import { ArgumentsHost } from '@nestjs/common/interfaces/features/arguments-host.interface';
import { BaseExceptionFilter } from './base-exception-filter';
export declare class ExceptionsHandler extends BaseExceptionFilter {
    private filters;
    constructor(applicationRef: HttpServer);
    next(exception: Error | HttpException | any, ctx: ArgumentsHost): any;
    setCustomFilters(filters: ExceptionFilterMetadata[]): void;
    invokeCustomFilters(exception: any, response: any): boolean;
}
