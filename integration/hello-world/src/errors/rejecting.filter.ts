import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';

@Catch()
export class RejectingFilter implements ExceptionFilter {
  async catch(exception: unknown, host: ArgumentsHost) {
    await Promise.resolve();
    throw new Error('Asynchronous filter failed');
  }
}
