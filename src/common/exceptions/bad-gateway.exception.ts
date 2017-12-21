import { HttpException } from './http.exception';
import { HttpStatus } from '../enums/http-status.enum';
import { createHttpExceptionBody } from './../utils/http-exception-body.util';

export class BadGatewayException extends HttpException {
  constructor(message?: string | object | any, error = 'Bad Gateway') {
    super(
      createHttpExceptionBody(message, error, HttpStatus.BAD_GATEWAY),
      HttpStatus.BAD_GATEWAY
    );
  }
}
