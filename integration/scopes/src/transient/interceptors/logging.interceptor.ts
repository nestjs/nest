import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Scope,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable({ scope: Scope.TRANSIENT })
export class Interceptor implements NestInterceptor {
  static COUNTER = 0;
  constructor() {
    Interceptor.COUNTER++;
  }
  intercept(context: ExecutionContext, call: CallHandler): Observable<any> {
    return call.handle();
  }
}
