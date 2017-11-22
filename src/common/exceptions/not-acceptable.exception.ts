import { HttpException } from './http.exception';
import { HttpStatus } from '../enums/http-status.enum';
import { createHttpExceptionBody } from './../utils/http-exception-body.util';

export class NotAcceptableException extends HttpException {
  constructor(message?: string | object | any, error = 'Not Acceptable') {
    super(
			createHttpExceptionBody(message, error, HttpStatus.NOT_ACCEPTABLE),
			HttpStatus.NOT_ACCEPTABLE,
		);
	}
}