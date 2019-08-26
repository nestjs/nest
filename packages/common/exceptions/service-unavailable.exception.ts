import { HttpException } from './http.exception';
import { HttpStatus } from '../enums/http-status.enum';

export class ServiceUnavailableException extends HttpException {
  constructor(message?: string | object | any, error = 'Service Unavailable') {
    super(
      HttpException.createBody(message, error, HttpStatus.SERVICE_UNAVAILABLE),
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}
