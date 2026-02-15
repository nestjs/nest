import { ParamsTokenFactory } from './params-token-factory.js';
import type { RouteParamtypes } from '@nestjs/common/internal';
import type { ArgumentMetadata, PipeTransform } from '@nestjs/common';

export class PipesConsumer {
  private readonly paramsTokenFactory = new ParamsTokenFactory();

  public async apply<TInput = unknown>(
    value: TInput,
    metadata: ArgumentMetadata,
    pipes: PipeTransform[],
  ) {
    const token = this.paramsTokenFactory.exchangeEnumForString(
      metadata.type as any as RouteParamtypes,
    );
    return this.applyPipes(
      value,
      {
        metatype: metadata.metatype,
        type: token,
        data: metadata.data,
        schema: metadata.schema,
      },
      pipes,
    );
  }

  public async applyPipes<TInput = unknown>(
    value: TInput,
    { metatype, type, data, schema }: ArgumentMetadata,
    transforms: PipeTransform[],
  ) {
    let result: unknown = value;
    for (const pipe of transforms) {
      result = await pipe.transform(result, { metatype, type, data, schema });
    }
    return result;
  }
}
