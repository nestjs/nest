import { ParamsTokenFactory } from './params-token-factory.js';
import type { RouteParamtypes } from '@nestjs/common/internal';
import type { ArgumentMetadata, PipeTransform } from '@nestjs/common';

const isThenable = (value: unknown): value is PromiseLike<unknown> =>
  value !== null &&
  (typeof value === 'object' || typeof value === 'function') &&
  typeof (value as PromiseLike<unknown>).then === 'function';

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
    // A custom param decorator with an async factory yields a promise, and
    // the pipes must see the value it resolves to. Any other value goes to
    // the first pipe right away.
    let result: unknown = isThenable(value) ? await value : value;
    for (const pipe of transforms) {
      result = await pipe.transform(result, { metatype, type, data, schema });
    }
    return result;
  }
}
