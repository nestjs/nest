import { HttpException } from './http.exception';
import { HttpStatus } from '../enums/http-status.enum';

export class PayloadTooLargeException extends HttpException {
  constructor(message?: string | object | any, error = 'Payload Too Large') {
    super(
      HttpException.createBody(message, error, HttpStatus.PAYLOAD_TOO_LARGE),
      HttpStatus.PAYLOAD_TOO_LARGE,
    );
  }
}
