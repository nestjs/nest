import { HttpException } from './http.exception';
import { HttpStatus } from '../enums/http-status.enum';

export class RequestTimeoutException extends HttpException {
  constructor(message?: string | object | any, error = 'Request Timeout') {
    super(
      HttpException.createBody(message, error, HttpStatus.REQUEST_TIMEOUT),
      HttpStatus.REQUEST_TIMEOUT,
    );
  }
}
