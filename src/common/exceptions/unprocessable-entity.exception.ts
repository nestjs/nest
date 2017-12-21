import { HttpException } from './http.exception';
import { HttpStatus } from '../enums/http-status.enum';
import { createHttpExceptionBody } from './../utils/http-exception-body.util';

export class UnprocessableEntityException extends HttpException {
  constructor(message?: string | object | any, error = 'Unprocessable Entity') {
    super(
      createHttpExceptionBody(message, error, HttpStatus.UNPROCESSABLE_ENTITY),
      HttpStatus.UNPROCESSABLE_ENTITY
    );
  }
}
