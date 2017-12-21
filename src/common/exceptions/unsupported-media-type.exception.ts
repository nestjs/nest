import { HttpException } from './http.exception';
import { HttpStatus } from '../enums/http-status.enum';
import { createHttpExceptionBody } from './../utils/http-exception-body.util';

export class UnsupportedMediaTypeException extends HttpException {
  constructor(
    message?: string | object | any,
    error = 'Unsupported Media Type'
  ) {
    super(
      createHttpExceptionBody(
        message,
        error,
        HttpStatus.UNSUPPORTED_MEDIA_TYPE
      ),
      HttpStatus.UNSUPPORTED_MEDIA_TYPE
    );
  }
}
