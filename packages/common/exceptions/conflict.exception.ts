import { HttpException } from './http.exception';
import { HttpStatus } from '../enums/http-status.enum';

export class ConflictException extends HttpException {
  constructor(message?: string | object | any, error = 'Conflict') {
    super(
      HttpException.createBody(message, error, HttpStatus.CONFLICT),
      HttpStatus.CONFLICT,
    );
  }
}
