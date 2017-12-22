import { ExceptionFilterMetadata } from '@nestjs/common/interfaces/exceptions/exception-filter-metadata.interface';
import { WsException } from '../exceptions/ws-exception';
export declare class WsExceptionsHandler {
  private filters;
  handle(exception: Error | WsException | any, client: any): any;
  setCustomFilters(filters: ExceptionFilterMetadata[]): void;
  invokeCustomFilters(exception: any, client: any): boolean;
}
