import { HttpException } from './http.exception';
import { HttpStatus } from '../enums/http-status.enum';

export class NotImplementedException extends HttpException {
  constructor(message?: string | object | any, error = 'Not Implemented') {
    super(
      HttpException.createBody(message, error, HttpStatus.NOT_IMPLEMENTED),
      HttpStatus.NOT_IMPLEMENTED,
    );
  }
}
