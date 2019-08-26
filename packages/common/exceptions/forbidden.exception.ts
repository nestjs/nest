import { HttpException } from './http.exception';
import { HttpStatus } from '../enums/http-status.enum';

export class ForbiddenException extends HttpException {
  constructor(message?: string | object | any, error = 'Forbidden') {
    super(
      HttpException.createBody(message, error, HttpStatus.FORBIDDEN),
      HttpStatus.FORBIDDEN,
    );
  }
}
