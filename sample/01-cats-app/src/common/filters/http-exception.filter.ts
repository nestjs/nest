import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { HttpException } from '@nestjs/common';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const status = exception.getStatus();
    const response = host.switchToHttp().getResponse();

    response.status(status).json({
      statusCode: status,
      message: `This is a message from the exception filter`,
    });
  }
}
