import { HttpException } from './http.exception';
import { HttpStatus } from '../enums/http-status.enum';

export class BadGatewayException extends HttpException {
  constructor(message?: string | object | any, error = 'Bad Gateway') {
    super(
      HttpException.createBody(message, error, HttpStatus.BAD_GATEWAY),
      HttpStatus.BAD_GATEWAY,
    );
  }
}
