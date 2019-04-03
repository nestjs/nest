import { ArgumentsHost } from '@nestjs/common';

export class ExternalExceptionFilter<T = any, R = any> {
  catch(exception: T, host: ArgumentsHost): R | Promise<R> {
    return (exception as any) as R;
  }
}
