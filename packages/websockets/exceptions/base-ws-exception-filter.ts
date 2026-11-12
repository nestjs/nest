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

/**
 * Whether a value holds binary data (a Buffer, an ArrayBuffer or a view of
 * one, or a Blob) anywhere in it. A loop with a record of what it has seen,
 * not recursion: the value comes from the client, which decides how deep it
 * is nested, and may refer to an object more than once.
 */
function holdsBinary(value: unknown): boolean {
  const pending: unknown[] = [value];
  const seen = new Set<object>();
  while (pending.length > 0) {
    const current = pending.pop();
    if (typeof current !== 'object' || current === null) {
      continue;
    }
    if (
      current instanceof ArrayBuffer ||
      ArrayBuffer.isView(current) ||
      (typeof Blob !== 'undefined' && current instanceof Blob)
    ) {
      return true;
    }
    if (seen.has(current)) {
      continue;
    }
    seen.add(current);
    for (const item of Object.values(current)) {
      pending.push(item);
    }
  }
  return false;
}

/**
 * Leaves the data out when it holds binary data, so that an error reply does
 * not send the client's binary data back to it.
 */
const defaultCauseFactory = (pattern: string, data: unknown) =>
  holdsBinary(data) ? { pattern } : { pattern, data };

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
   * The default one leaves the data out when it holds binary data (Buffers,
   * ArrayBuffers or their views).
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
      this.options.causeFactory ?? defaultCauseFactory;
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
