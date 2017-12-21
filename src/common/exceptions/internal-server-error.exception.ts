import { HttpException } from './http.exception';
import { HttpStatus } from '../enums/http-status.enum';
import { createHttpExceptionBody } from './../utils/http-exception-body.util';

export class InternalServerErrorException extends HttpException {
  constructor(
    message?: string | object | any,
    error = 'Internal Server Error',
  ) {
    super(
      createHttpExceptionBody(message, error, HttpStatus.INTERNAL_SERVER_ERROR),
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
