import { HttpException } from './http.exception';
import { HttpStatus } from '../enums/http-status.enum';

export class MethodNotAllowedException extends HttpException {
  constructor(message?: string | object | any, error = 'Method Not Allowed') {
    super(
      HttpException.createBody(message, error, HttpStatus.METHOD_NOT_ALLOWED),
      HttpStatus.METHOD_NOT_ALLOWED,
    );
  }
}
