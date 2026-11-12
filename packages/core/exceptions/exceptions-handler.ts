import { HttpException } from '@nestjs/common';
import { ExceptionFilterMetadata } from '@nestjs/common/interfaces/exceptions/exception-filter-metadata.interface';
import { ArgumentsHost } from '@nestjs/common/interfaces/features/arguments-host.interface';
import { selectExceptionFilterMetadata } from '@nestjs/common/utils/select-exception-filter-metadata.util';
import { isEmpty } from '@nestjs/common/utils/shared.utils';
import { isObservable } from 'rxjs';
import { types } from 'util';
import { InvalidExceptionFilterException } from '../errors/exceptions/invalid-exception-filter.exception';
import { BaseExceptionFilter } from './base-exception-filter';

export class ExceptionsHandler extends BaseExceptionFilter {
  private filters: ExceptionFilterMetadata[] = [];

  public next(exception: Error | HttpException, ctx: ArgumentsHost) {
    if (this.invokeCustomFilters(exception, ctx)) {
      return;
    }
    super.catch(exception, ctx);
  }

  public setCustomFilters(filters: ExceptionFilterMetadata[]) {
    if (!Array.isArray(filters)) {
      throw new InvalidExceptionFilterException();
    }
    this.filters = filters;
  }

  public invokeCustomFilters<T = any>(
    exception: T,
    ctx: ArgumentsHost,
  ): boolean {
    if (isEmpty(this.filters)) {
      return false;
    }

    const filter = selectExceptionFilterMetadata(this.filters, exception);
    if (!filter) {
      return false;
    }
    const result = filter.func(exception, ctx);
    if (types.isPromise(result)) {
      // What an async filter returns is known once it settles. Only that is
      // handled here: a filter that rejects is left as it is.
      void result.then(value => {
        if (this.isLeftUnanswered(value, ctx)) {
          this.answerLeftException(exception, ctx);
        }
      });
      return true;
    }
    return !this.isLeftUnanswered(result, ctx);
  }

  /**
   * A filter written for another context returns what that context is to
   * send, and leaves an HTTP request unanswered when it is bound to HTTP
   * routes as well (as a global filter is): an RPC exception filter (e.g. a
   * GrpcExceptionFilter in a hybrid application) returns a stream, or a
   * promise of one, and a GraphQL exception filter the error to report. A
   * filter that answers the request returns nothing, or e.g. the response.
   */
  private isLeftUnanswered(result: unknown, ctx: ArgumentsHost): boolean {
    return (
      (isObservable(result) || result instanceof Error) &&
      !this.applicationRef?.isHeadersSent(ctx.getArgByIndex(1))
    );
  }

  private answerLeftException(exception: unknown, ctx: ArgumentsHost) {
    try {
      super.catch(exception, ctx);
    } catch (err) {
      // Nothing catches what the built-in filter throws (e.g. for a body that
      // cannot be serialized) once an async filter has settled
      this.handleUnknownError(
        err,
        ctx,
        (this.applicationRef ?? this.httpAdapterHost?.httpAdapter)!,
      );
    }
  }
}
