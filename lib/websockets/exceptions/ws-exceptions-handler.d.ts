import { ExceptionFilterMetadata } from '@nestjs/common/interfaces/exceptions/exception-filter-metadata.interface';
import { WsException } from '../exceptions/ws-exception';
import { ArgumentsHost } from '@nestjs/common';
export declare class WsExceptionsHandler {
  private filters;
  handle(exception: Error | WsException | any, args: ArgumentsHost): any;
  setCustomFilters(filters: ExceptionFilterMetadata[]): void;
  invokeCustomFilters(exception: any, args: ArgumentsHost): boolean;
}
