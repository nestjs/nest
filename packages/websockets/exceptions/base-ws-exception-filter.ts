import {
  ArgumentsHost,
  IntrinsicException,
  Logger,
  WsExceptionFilter,
} from '@nestjs/common';
import { isObject } from '@nestjs/common/utils/shared.utils';
import { MESSAGES } from '@nestjs/core/constants';
import { WsException } from '../errors/ws-exception';

export interface ErrorPayload<Cause = { pattern: string; data: unknown }> {
  /**
   * Error message identifier.
   */
  status: 'error';
  /**
   * Error message.
   */
  message: string;
  /**
   * Message that caused the exception.
   */
  cause?: Cause;
}

interface BaseWsExceptionFilterOptions {
  /**
   * When true, the data that caused the exception will be included in the response.
   * This is useful when you want to provide additional context to the client, or
   * when you need to associate the error with a specific request.
   * @default true
   */
  includeCause?: boolean;

  /**
   * A factory function that can be used to control the shape of the "cause" object.
   * This is useful when you need a custom structure for the cause object.
   * @default (pattern, data) => ({ pattern, data })
   */
  causeFactory?: (pattern: string, data: unknown) => Record<string, any>;
}

/**
 * @publicApi
 */
export class BaseWsExceptionFilter<
  TError = any,
> implements WsExceptionFilter<TError> {
  protected static readonly logger = new Logger('WsExceptionsHandler');

  constructor(protected readonly options: BaseWsExceptionFilterOptions = {}) {
    this.options.includeCause = this.options.includeCause ?? true;
    this.options.causeFactory =
      this.options.causeFactory ?? ((pattern, data) => ({ pattern, data }));
  }

  public catch(exception: TError, host: ArgumentsHost) {
    const client = host.switchToWs().getClient();
    const pattern = host.switchToWs().getPattern();
    const data = host.switchToWs().getData();
    this.handleError(client, exception, {
      pattern,
      data,
    });
  }

  public handleError<TClient extends { emit: Function }>(
    client: TClient,
    exception: TError,
    cause: ErrorPayload['cause'],
  ) {
    if (!(exception instanceof WsException)) {
      return this.handleUnknownError(exception, client, cause);
    }

    const status = 'error';
    const result = exception.getError();

    // An Error, as in `new WsException(err)`, would be sent with its
    // enumerable properties, e.g. the request config of an HTTP client error
    if (result instanceof Error) {
      return this.handleUnknownError(result as TError, client, cause);
    }
    if (isObject(result)) {
      return client.emit('exception', result);
    }

    const payload: ErrorPayload<unknown> = {
      status,
      message: result,
    };

    if (this.options?.includeCause && cause) {
      payload.cause = this.options.causeFactory!(cause.pattern, cause.data);
    }

    this.emitErrorPayload(client, payload);
  }

  public handleUnknownError<TClient extends { emit: Function }>(
    exception: TError,
    client: TClient,
    data: ErrorPayload['cause'],
  ) {
    const status = 'error';
    const payload: ErrorPayload<unknown> = {
      status,
      message: MESSAGES.UNKNOWN_EXCEPTION_MESSAGE,
    };

    if (this.options?.includeCause && data) {
      payload.cause = this.options.causeFactory!(data.pattern, data.data);
    }

    // Logged first, so that a reply that cannot be sent never hides it
    if (!(exception instanceof IntrinsicException)) {
      const logger = BaseWsExceptionFilter.logger;
      logger.error(exception);
    }

    this.emitErrorPayload(client, payload);
  }

  public isExceptionObject(err: any): err is Error {
    return isObject(err) && !!(err as Error).message;
  }

  /**
   * Sends the error payload, and sends it again without the "cause" when that
   * fails. The cause echoes the client's message, which `JSON.parse` accepts
   * at any depth, while the Socket.IO encoder overflows the stack on it.
   */
  private emitErrorPayload<TClient extends { emit: Function }>(
    client: TClient,
    payload: ErrorPayload<unknown>,
  ): void {
    try {
      client.emit('exception', payload);
    } catch (err) {
      // Without a cause, the payload holds nothing the client sent
      if (!('cause' in payload)) {
        throw err;
      }
      client.emit('exception', {
        status: payload.status,
        message: payload.message,
      });
    }
  }
}
