import { ArgumentsHost, WsExceptionFilter } from '@nestjs/common';
import { isObject } from '@nestjs/common/utils/shared.utils';
import { MESSAGES } from '@nestjs/core/constants';
import { WsException } from './ws-exception';

export class BaseWsExceptionFilter<T = any> implements WsExceptionFilter<T> {
  catch(exception: T, host: ArgumentsHost) {
    const client = host.switchToWs().getClient();
    const status = 'error';

    if (!(exception instanceof WsException)) {
      const errorMessage = MESSAGES.UNKNOWN_EXCEPTION_MESSAGE;
      return client.emit('exception', { status, message: errorMessage });
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
