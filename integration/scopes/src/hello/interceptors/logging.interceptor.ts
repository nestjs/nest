import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
  Scope,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable({ scope: Scope.REQUEST })
export class Interceptor implements NestInterceptor {
  static COUNTER = 0;
  static REQUEST_SCOPED_DATA = [] as number[];

  constructor(@Inject('REQUEST_ID') private readonly requestId: number) {
    Interceptor.COUNTER++;
  }

  intercept(context: ExecutionContext, call: CallHandler): Observable<any> {
    Interceptor.REQUEST_SCOPED_DATA.push(this.requestId);
    return call.handle();
  }
}
