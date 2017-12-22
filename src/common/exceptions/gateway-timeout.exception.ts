import { HttpException } from './http.exception';
import { HttpStatus } from '../enums/http-status.enum';
import { createHttpExceptionBody } from './../utils/http-exception-body.util';

export class GatewayTimeoutException extends HttpException {
  constructor(message?: string | object | any, error = 'Gateway Timeout') {
    super(
      createHttpExceptionBody(message, error, HttpStatus.GATEWAY_TIMEOUT),
      HttpStatus.GATEWAY_TIMEOUT,
    );
  }
}
