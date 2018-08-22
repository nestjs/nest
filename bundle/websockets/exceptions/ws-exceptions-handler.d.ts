import { ArgumentsHost } from '@nestjs/common';
import { ExceptionFilterMetadata } from '@nestjs/common/interfaces/exceptions/exception-filter-metadata.interface';
import { WsException } from '../exceptions/ws-exception';
import { BaseWsExceptionFilter } from './base-ws-exception-filter';
export declare class WsExceptionsHandler extends BaseWsExceptionFilter {
    private filters;
    handle(exception: Error | WsException | any, host: ArgumentsHost): any;
    setCustomFilters(filters: ExceptionFilterMetadata[]): void;
    invokeCustomFilters(exception: any, args: ArgumentsHost): boolean;
}
