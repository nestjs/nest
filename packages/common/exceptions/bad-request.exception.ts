import { HttpException } from './http.exception';
import { HttpStatus } from '../enums/http-status.enum';

export class BadRequestException extends HttpException {
  constructor(message?: string | object | any, error = 'Bad Request') {
    super(
      HttpException.createBody(message, error, HttpStatus.BAD_REQUEST),
      HttpStatus.BAD_REQUEST,
    );
  }
}
