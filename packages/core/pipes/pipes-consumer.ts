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
    const resolvedMetadata =
      typeof metadata.type === 'string' && Object.isFrozen(metadata)
        ? metadata
        : {
            metatype: metadata.metatype,
            type:
              typeof metadata.type === 'string'
                ? metadata.type
                : this.paramsTokenFactory.exchangeEnumForString(
                    metadata.type as any as RouteParamtypes,
                  ),
            data: metadata.data,
            schema: metadata.schema,
          };
    return this.applyPipes(value, resolvedMetadata, pipes);
  }

  public async applyPipes<TInput = unknown>(
    value: TInput,
    metadata: ArgumentMetadata,
    transforms: PipeTransform[],
  ) {
    // A custom param decorator with an async factory yields a promise, and
    // the pipes must see the value it resolves to. Any other value goes to
    // the first pipe right away.
    let result: unknown = isThenable(value) ? await value : value;
    for (let i = 0; i < transforms.length; i++) {
      const transformed = transforms[i].transform(result, metadata);
      result = isThenable(transformed) ? await transformed : transformed;
    }
    return result;
  }
}
