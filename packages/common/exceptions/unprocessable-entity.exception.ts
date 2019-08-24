import { HttpException } from './http.exception';
import { HttpStatus } from '../enums/http-status.enum';

export class UnprocessableEntityException extends HttpException {
  constructor(message?: string | object | any, error = 'Unprocessable Entity') {
    super(
      HttpException.createBody(message, error, HttpStatus.UNPROCESSABLE_ENTITY),
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}
