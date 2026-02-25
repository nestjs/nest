import { expect } from 'chai';
import { createHmac } from 'crypto';
import { ExecutionContext, UnauthorizedException } from '../../index';
import { HmacGuard } from '../../guards/hmac.guard';

describe('HmacGuard', () => {
  let guard: HmacGuard;
  const secret = 'your-shared-secret';

  beforeEach(() => {
    guard = new HmacGuard({ secret });
  });

  it('should throw Error if secret is not configured', () => {
    const invalidGuard = new HmacGuard();
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({}),
      }),
    } as unknown as ExecutionContext;

    expect(() => invalidGuard.canActivate(context)).to.throw(
      'HMAC secret is not configured',
    );
  });

  it('should throw UnauthorizedException if signature is missing', () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {},
        }),
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(context)).to.throw(UnauthorizedException);
  });

  it('should return true for valid signature', () => {
    const body = { data: 'test' };
    const payload = JSON.stringify(body);
    const signature = createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { 'x-signature': signature },
          body,
        }),
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).to.be.true;
  });

  it('should throw UnauthorizedException for invalid signature', () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { 'x-signature': 'invalid-sig' },
          body: { data: 'test' },
        }),
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(context)).to.throw(UnauthorizedException);
  });

  it('should throw UnauthorizedException for signature with different length', () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { 'x-signature': 'shrt' },
          body: { data: 'test' },
        }),
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(context)).to.throw(UnauthorizedException);
  });
});
