export class Reflector {
  public get<T>(metadataKey: string, target: any): T {
    return Reflect.getMetadata(metadataKey, target) as T;
  }
}
