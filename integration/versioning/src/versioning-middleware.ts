import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import * as sinon from 'sinon';
import { NextFunction } from 'express';

export const SpyInjectToken = 'SpyInjectToken';

@Injectable()
export class VersioningMiddleware implements NestMiddleware {
  constructor(@Inject(SpyInjectToken) private readonly spy: sinon.SinonSpy) {}

  use(req: any, res: any, next: NextFunction): any {
    this.spy(req, res);
    next();
  }
}
