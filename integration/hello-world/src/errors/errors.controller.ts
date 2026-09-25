import {
  BadRequestException,
  Controller,
  Get,
  Header,
  UseFilters,
} from '@nestjs/common';
import { RejectingFilter } from './rejecting.filter.js';

@Controller()
export class ErrorsController {
  @Get('sync')
  synchronous() {
    this.throwError();
  }

  @Get('async')
  async asynchronous() {
    this.throwError();
  }

  @Get('unexpected-error')
  @Header('Content-Type', 'application/pdf')
  unexpectedError() {
    throw new Error();
  }

  @Get('error-with-status-code')
  errorWithStatusCode() {
    throw Object.assign(new Error('forbidden by error instance'), {
      statusCode: 403,
    });
  }

  @Get('rejecting-filter')
  @UseFilters(RejectingFilter)
  rejectingFilter() {
    this.throwError();
  }

  throwError() {
    throw new BadRequestException({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Integration test',
    });
  }
}
