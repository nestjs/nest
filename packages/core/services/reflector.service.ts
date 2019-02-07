import { Type } from '@nestjs/common';

export class Reflector {
  public get<TResult = any, TKey = any>(
    metadataKey: TKey,
    target: Type<any> | Function,
  ): TResult {
    return Reflect.getMetadata(metadataKey, target) as TResult;
  }

  public getAll<TResult extends any[] = any, TKey = any>(
    metadataKey: TKey,
    targets: (Type<any> | Function)[],
  ): TResult {
    return (targets || []).map(target =>
      Reflect.getMetadata(metadataKey, target),
    ) as TResult;
  }
}
