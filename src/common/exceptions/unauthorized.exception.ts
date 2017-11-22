import { HttpException } from './http.exception';
import { HttpStatus } from '../enums/http-status.enum';
import { createHttpExceptionBody } from './../utils/http-exception-body.util';

export class UnauthorizedException extends HttpException {
  constructor(message?: string | object | any, error = 'Unauthorized') {
    super(
			createHttpExceptionBody(message, error, HttpStatus.UNAUTHORIZED),
			HttpStatus.UNAUTHORIZED,
		);
	}
}