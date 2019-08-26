import { HttpException } from './http.exception';
import { HttpStatus } from '../enums/http-status.enum';

export class GatewayTimeoutException extends HttpException {
  constructor(message?: string | object | any, error = 'Gateway Timeout') {
    super(
      HttpException.createBody(message, error, HttpStatus.GATEWAY_TIMEOUT),
      HttpStatus.GATEWAY_TIMEOUT,
    );
  }
}
