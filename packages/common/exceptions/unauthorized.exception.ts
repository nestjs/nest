import { HttpException } from './http.exception';
import { HttpStatus } from '../enums/http-status.enum';

export class UnauthorizedException extends HttpException {
  constructor(message?: string | object | any, error = 'Unauthorized') {
    super(
      HttpException.createBody(message, error, HttpStatus.UNAUTHORIZED),
      HttpStatus.UNAUTHORIZED,
    );
  }
}
