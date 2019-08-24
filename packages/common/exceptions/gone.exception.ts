import { HttpException } from './http.exception';
import { HttpStatus } from '../enums/http-status.enum';

export class GoneException extends HttpException {
  constructor(message?: string | object | any, error = 'Gone') {
    super(
      HttpException.createBody(message, error, HttpStatus.GONE),
      HttpStatus.GONE,
    );
  }
}
