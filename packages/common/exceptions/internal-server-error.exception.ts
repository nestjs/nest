import { HttpException } from './http.exception';
import { HttpStatus } from '../enums/http-status.enum';

export class InternalServerErrorException extends HttpException {
  constructor(
    message?: string | object | any,
    error = 'Internal Server Error',
  ) {
    super(
      HttpException.createBody(message, error, HttpStatus.INTERNAL_SERVER_ERROR),
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
