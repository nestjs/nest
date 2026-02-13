import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum.js';
import {
  ArgumentMetadata,
  PipeTransform,
} from '@nestjs/common/interfaces/index.js';
import { ParamsTokenFactory } from './params-token-factory.js';

export class PipesConsumer {
  private readonly paramsTokenFactory = new ParamsTokenFactory();

  public async apply<TInput = unknown>(
    value: TInput,
    { metatype, type, data }: ArgumentMetadata,
    pipes: PipeTransform[],
  ) {
    const token = this.paramsTokenFactory.exchangeEnumForString(
      type as any as RouteParamtypes,
    );
    return this.applyPipes(value, { metatype, type: token, data }, pipes);
  }

  public async applyPipes<TInput = unknown>(
    value: TInput,
    { metatype, type, data }: { metatype: any; type?: any; data?: any },
    transforms: PipeTransform[],
  ) {
    let result: unknown = value;
    for (const pipe of transforms) {
      result = await pipe.transform(result, { metatype, type, data });
    }
    return result;
  }
}
