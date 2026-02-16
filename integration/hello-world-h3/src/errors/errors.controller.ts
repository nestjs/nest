import {
  BadRequestException,
  Controller,
  Get,
  Header,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

@Controller('errors')
export class ErrorsController {
  @Get('sync')
  synchronous() {
    this.throwBadRequest();
  }

  @Get('async')
  async asynchronous() {
    this.throwBadRequest();
  }

  @Get('not-found')
  notFound() {
    throw new NotFoundException('Resource not found');
  }

  @Get('internal')
  internal() {
    throw new InternalServerErrorException('Internal server error');
  }

  @Get('unexpected-error')
  @Header('Content-Type', 'application/pdf')
  unexpectedError() {
    throw new Error('Unexpected error');
  }

  throwBadRequest() {
    throw new BadRequestException({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Integration test',
    });
  }
}
