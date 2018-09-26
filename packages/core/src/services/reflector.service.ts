export class Reflector {
  public get<T>(metadataKey, target): T {
    return Reflect.getMetadata(metadataKey, target) as T;
  }
}
