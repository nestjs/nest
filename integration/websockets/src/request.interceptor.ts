import { CallHandler, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class RequestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const client = context.switchToWs().getClient();
    const pattern = context.switchToWs().getPattern();
    client.pattern = pattern;
    return next.handle();
  }
}
