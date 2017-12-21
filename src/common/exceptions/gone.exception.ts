import { HttpException } from './http.exception';
import { HttpStatus } from '../enums/http-status.enum';
import { createHttpExceptionBody } from './../utils/http-exception-body.util';

export class GoneException extends HttpException {
  constructor(message?: string | object | any, error = 'Gone') {
    super(
      createHttpExceptionBody(message, error, HttpStatus.GONE),
      HttpStatus.GONE,
    );
  }
}
