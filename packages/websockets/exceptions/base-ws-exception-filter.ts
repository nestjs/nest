import { ArgumentsHost, WsExceptionFilter } from '@nestjs/common';
import { isObject } from '@nestjs/common/utils/shared.utils';
import { MESSAGES } from '@nestjs/core/constants';
import { WsException } from '../errors/ws-exception';

export class BaseWsExceptionFilter<T = any> implements WsExceptionFilter<T> {
  public catch(exception: T, host: ArgumentsHost) {
    const client = host.switchToWs().getClient();
    this.handleError(client, exception);
  }

  public handleError<IClient extends { emit: Function }>(
    client: IClient,
    exception: T,
  ) {
    const status = 'error';

    if (!(exception instanceof WsException)) {
      return client.emit('exception', {
        status,
        message: MESSAGES.UNKNOWN_EXCEPTION_MESSAGE,
      });
    }
    const result = exception.getError();
    const message = isObject(result)
      ? result
      : {
          status,
          message: result,
        };

    client.emit('exception', message);
  }
}
