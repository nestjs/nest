import { HttpException } from './http.exception';
import { HttpStatus } from '../enums/http-status.enum';
import { createHttpExceptionBody } from './../utils/http-exception-body.util';

export class ConflictException extends HttpException {
	constructor(message?: string | object | any, error = 'Conflict') {
    super(
			createHttpExceptionBody(message, error, HttpStatus.CONFLICT),
			HttpStatus.CONFLICT,
		);
	}
}