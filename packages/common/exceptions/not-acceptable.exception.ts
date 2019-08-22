import { HttpException } from './http.exception';
import { HttpStatus } from '../enums/http-status.enum';

export class NotAcceptableException extends HttpException {
  constructor(message?: string | object | any, error = 'Not Acceptable') {
    super(
      HttpException.createBody(message, error, HttpStatus.NOT_ACCEPTABLE),
      HttpStatus.NOT_ACCEPTABLE,
    );
  }
}
