export class Reflector {
  public get<TResult = any, TKey = any, TInput = any>(
    metadataKey: TKey,
    target: TInput,
  ): TResult {
    return Reflect.getMetadata(metadataKey, target) as TResult;
  }
}
