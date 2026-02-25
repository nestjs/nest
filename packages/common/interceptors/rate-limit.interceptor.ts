import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Interceptor that provides basic in-memory rate limiting.
 *
 * @publicApi
 */
@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private readonly requestCounts = new Map<
    string,
    { count: number; expires: number }
  >();
  private readonly limit: number;
  private readonly windowMs: number;

  constructor(options?: { limit?: number; windowMs?: number }) {
    this.limit = options?.limit || 10;
    this.windowMs = options?.windowMs || 60000;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    this.cleanup();
    const request = context.switchToHttp().getRequest();
    const key = this.generateKey(request);
    const now = Date.now();

    const record = this.requestCounts.get(key) || {
      count: 0,
      expires: now + this.windowMs,
    };

    if (now > record.expires) {
      record.count = 1;
      record.expires = now + this.windowMs;
    } else {
      record.count++;
    }

    this.requestCounts.set(key, record);

    if (record.count > this.limit) {
      throw new HttpException(
        'Too Many Requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return next.handle();
  }

  protected generateKey(request: any): string {
    return request.ip || 'global';
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, record] of this.requestCounts.entries()) {
      if (now > record.expires) {
        this.requestCounts.delete(key);
      }
    }
  }
}
