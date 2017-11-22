import { HttpException } from './http.exception';
import { HttpStatus } from '../enums/http-status.enum';
import { createHttpExceptionBody } from './../utils/http-exception-body.util';

export class ForbiddenException extends HttpException {
  constructor(message?: string | object | any, error = 'Forbidden') {
    super(
			createHttpExceptionBody(message, error, HttpStatus.FORBIDDEN),
			HttpStatus.FORBIDDEN,
		);
	}
}