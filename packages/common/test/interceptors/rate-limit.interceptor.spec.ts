import { expect } from 'chai';
import { of } from 'rxjs';
import { ExecutionContext, HttpException, HttpStatus } from '../../index';
import { RateLimitInterceptor } from '../../interceptors/rate-limit.interceptor';

describe('RateLimitInterceptor', () => {
  let interceptor: RateLimitInterceptor;

  beforeEach(() => {
    interceptor = new RateLimitInterceptor({ limit: 10, windowMs: 60000 });
  });

  it('should allow requests within limit', done => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ ip: '127.0.0.1' }),
      }),
    } as unknown as ExecutionContext;

    const next = {
      handle: () => of({ success: true }),
    };

    interceptor.intercept(context, next).subscribe({
      next: val => {
        expect(val).to.deep.equal({ success: true });
        done();
      },
    });
  });

  it('should block requests exceeding limit', () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ ip: '192.168.1.1' }),
      }),
    } as unknown as ExecutionContext;

    const next = {
      handle: () => of({ success: true }),
    };

    // Simulate 10 requests
    for (let i = 0; i < 10; i++) {
      interceptor.intercept(context, next);
    }

    // 11th request should fail
    expect(() => interceptor.intercept(context, next)).to.throw(HttpException);
  });
});
