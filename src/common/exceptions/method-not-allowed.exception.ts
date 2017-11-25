import { HttpException } from './http.exception';
import { HttpStatus } from '../enums/http-status.enum';
import { createHttpExceptionBody } from './../utils/http-exception-body.util';

export class MethodNotAllowedException extends HttpException {
  constructor(message?: string | object | any, error = 'Method Not Allowed') {
    super(
			createHttpExceptionBody(message, error, HttpStatus.METHOD_NOT_ALLOWED),
			HttpStatus.METHOD_NOT_ALLOWED,
		);
	}
}