import { createHttpExceptionBody } from '../../../helpers';
import { HttpException } from './http.exception';
import { HttpStatus } from '../../../enums';

export class GatewayTimeoutException extends HttpException {
  constructor(message?: any, error = 'Gateway Timeout') {
    super(
      createHttpExceptionBody(message, error, HttpStatus.GATEWAY_TIMEOUT),
      HttpStatus.GATEWAY_TIMEOUT,
    );
  }
}
