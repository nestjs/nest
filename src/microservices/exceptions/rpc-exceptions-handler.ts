import { Logger } from '@nestjs/common';
import { isEmpty, isObject } from '@nestjs/common/utils/shared.utils';
import { InvalidExceptionFilterException } from '@nestjs/core/errors/exceptions/invalid-exception-filter.exception';
import { messages } from '@nestjs/core/constants';
import { Observable } from 'rxjs/Observable';
import { RpcException } from './rpc-exception';
import { RpcExceptionFilterMetadata } from '@nestjs/common/interfaces/exceptions';
import { _throw } from 'rxjs/observable/throw';


export class RpcExceptionsHandler {
  private static readonly logger = new Logger(RpcExceptionsHandler.name);
  private filters: RpcExceptionFilterMetadata[] = [];

  public handle(exception: Error | RpcException | any): Observable<any> {
    const filterResult$ = this.invokeCustomFilters(exception);
    if (filterResult$) {
      return filterResult$;
    }
    const status = 'error';
    if (!(exception instanceof RpcException)) {
      const message = messages.UNKNOWN_EXCEPTION_MESSAGE;

      const isError = isObject(exception) && (exception as Error).message;
      const loggerArgs = isError
        ? [(exception as Error).message, (exception as Error).stack]
        : [exception];
      const logger = RpcExceptionsHandler.logger;
      logger.error.apply(logger, loggerArgs);

      return _throw({ status, message });
    }
    const res = exception.getError();
    const message = isObject(res) ? res : { status, message: res };
    return _throw(message);
  }

  public setCustomFilters(filters: RpcExceptionFilterMetadata[]) {
    if (!Array.isArray(filters)) {
      throw new InvalidExceptionFilterException();
    }
    this.filters = filters;
  }

  public invokeCustomFilters(exception): Observable<any> | null {
    if (isEmpty(this.filters)) return null;

    const filter = this.filters.find(({ exceptionMetatypes, func }) => {
      const hasMetatype =
        !exceptionMetatypes.length ||
        !!exceptionMetatypes.find(
          ExceptionMetatype => exception instanceof ExceptionMetatype,
        );
      return hasMetatype;
    });
    return filter ? filter.func(exception) : null;
  }
}
