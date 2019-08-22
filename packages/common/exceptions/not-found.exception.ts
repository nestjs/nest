import { HttpException } from './http.exception';
import { HttpStatus } from '../enums/http-status.enum';

export class NotFoundException extends HttpException {
  constructor(message?: string | object | any, error = 'Not Found') {
    super(
      HttpException.createBody(message, error, HttpStatus.NOT_FOUND),
      HttpStatus.NOT_FOUND,
    );
  }
}
