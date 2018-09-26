import { HttpException } from './http.exception';
import { HttpStatus } from '../enums/http-status.enum';
import { createHttpExceptionBody } from '../utils/http-exception-body.util';

/**
 * Any attempt to brew coffee with a teapot should result in the error code "418 I'm a teapot".
 * The resulting entity body MAY be short and stout.
 *
 * http://save418.com/
 */
export class ImATeapotException extends HttpException {
  constructor(message?: string | object | any, error = 'I\'m a teapot') {
    super(
      createHttpExceptionBody(message, error, HttpStatus.I_AM_A_TEAPOT),
      HttpStatus.I_AM_A_TEAPOT,
    );
  }
}
