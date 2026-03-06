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

  public handleError<TClient extends { emit?: Function; send?: Function }>(
    client: TClient,
    exception: TError,
    cause: ErrorPayload['cause'],
  ) {
    if (!(exception instanceof WsException)) {
      return this.handleUnknownError(exception, client, cause);
    }

    const status = 'error';
    const result = exception.getError();

    if (isObject(result)) {
      return this.sendExceptionToClient(client, 'exception', result);
    }

    const payload: ErrorPayload<unknown> = {
      status,
      message: result,
    };

    if (this.options?.includeCause && cause) {
      payload.cause = this.options.causeFactory!(cause.pattern, cause.data);
    }

    this.sendExceptionToClient(client, 'exception', payload);
  }

  public handleUnknownError<
    TClient extends { emit?: Function; send?: Function },
  >(exception: TError, client: TClient, data: ErrorPayload['cause']) {
    const status = 'error';
    const payload: ErrorPayload<unknown> = {
      status,
      message: MESSAGES.UNKNOWN_EXCEPTION_MESSAGE,
    };

    if (this.options?.includeCause && data) {
      payload.cause = this.options.causeFactory!(data.pattern, data.data);
    }

    this.sendExceptionToClient(client, 'exception', payload);

    if (!(exception instanceof IntrinsicException)) {
      const logger = BaseWsExceptionFilter.logger;
      logger.error(exception);
    }
  }

  /**
   * Sends the exception payload to the client using the appropriate transport.
   * For native WebSocket clients (e.g., `ws` library), uses `client.send()`.
   * For socket.io clients, uses `client.emit()`.
   *
   * Override this method if you use a custom WebSocket adapter with a
   * different sending mechanism.
   */
  protected sendExceptionToClient(
    client: any,
    event: string,
    payload: any,
  ): void {
    if (this.isNativeWebSocket(client)) {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ event, data: payload }));
      }
    } else if (typeof client.emit === 'function') {
      client.emit(event, payload);
    }
  }

  /**
   * Determines whether the client is a native WebSocket instance (e.g., from
   * the `ws` library) rather than a socket.io socket.
   */
  protected isNativeWebSocket(client: any): boolean {
    return (
      typeof client.send === 'function' &&
      typeof client.readyState === 'number' &&
      !client.nsp
    );
  }

  public isExceptionObject(err: any): err is Error {
    return isObject(err) && !!(err as Error).message;
  }
}
