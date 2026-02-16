import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

export const OVERRIDE_VALUE = 'overridden';

@Injectable()
export class OverrideInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return of(OVERRIDE_VALUE);
  }
}

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map(data => ({ data })));
  }
}

@Injectable()
export class HeaderInterceptor implements NestInterceptor {
  constructor(private readonly headers: Record<string, string>) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse();
    for (const [key, value] of Object.entries(this.headers)) {
      if (response.setHeader) {
        response.setHeader(key, value);
      } else if (response.headers?.set) {
        response.headers.set(key, value);
      }
    }
    return next.handle();
  }
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const now = Date.now();

    return next.handle().pipe(
      map(data => ({
        ...data,
        requestInfo: {
          method: request.method,
          url: request.url,
          executionTime: Date.now() - now,
        },
      })),
    );
  }
}
