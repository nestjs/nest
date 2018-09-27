import { Injectable } from '@nest/core';

import { ParamsTokenFactory } from './params-token-factory.service';
import { Transform } from '../interfaces';

@Injectable()
export class PipesConsumer {
  constructor(private readonly paramsTokenFactory: ParamsTokenFactory) {}

  public async apply(
    value: any,
    { metatype, type, data },
    transforms: Transform<any>[],
  ) {
    const token = this.paramsTokenFactory.exchangeEnumForString(type);
    return await this.applyPipes(
      value,
      { metatype, type: token, data },
      transforms,
    );
  }

  private async applyPipes(
    value: any,
    { metatype, type, data },
    transforms: Transform<any>[],
  ) {
    return await transforms.reduce(async (deferredValue, fn) => {
      const val = await deferredValue;
      return fn(val, { metatype, type, data });
    }, Promise.resolve(value));
  }
}
