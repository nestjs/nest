import { createHttpExceptionBody } from '../../../helpers';
import { HttpException } from './http.exception';
import { HttpStatus } from '../../../enums';

export class BadGatewayException extends HttpException {
  constructor(message?: any, error = 'Bad Gateway') {
    super(
      createHttpExceptionBody(message, error, HttpStatus.BAD_GATEWAY),
      HttpStatus.BAD_GATEWAY,
    );
  }
}
