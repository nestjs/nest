import * as passport from 'passport';
import { Type } from '@nestjs/common/interfaces';

export abstract class AbstractStrategy {
  abstract validate(...args: any[]): any;
}

export function PassportStrategy<T extends Type<any> = any>(
  Strategy: T,
): Type<AbstractStrategy> {
  abstract class MixinStrategy extends Strategy {
    abstract validate(...args: any[]): any;
    constructor(...args: any[]) {
      super(...args, (...params: any[]) => this.validate(...params));
      passport.use(this);
    }
  }
  return MixinStrategy;
}
