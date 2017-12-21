import { HttpException } from './http.exception';
import { HttpStatus } from '../enums/http-status.enum';
import { createHttpExceptionBody } from './../utils/http-exception-body.util';

export class PayloadTooLargeException extends HttpException {
  constructor(message?: string | object | any, error = 'Payload Too Large') {
    super(
      createHttpExceptionBody(message, error, HttpStatus.PAYLOAD_TOO_LARGE),
      HttpStatus.PAYLOAD_TOO_LARGE,
    );
  }
}
