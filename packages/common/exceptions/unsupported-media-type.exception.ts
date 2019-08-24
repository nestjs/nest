import { HttpException } from './http.exception';
import { HttpStatus } from '../enums/http-status.enum';

export class UnsupportedMediaTypeException extends HttpException {
  constructor(
    message?: string | object | any,
    error = 'Unsupported Media Type',
  ) {
    super(
      HttpException.createBody(
        message,
        error,
        HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      ),
      HttpStatus.UNSUPPORTED_MEDIA_TYPE,
    );
  }
}
