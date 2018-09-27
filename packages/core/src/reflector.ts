import 'reflect-metadata';

import { Type, Provider } from './interfaces';
import { NestModule } from './module';
import {
  SCOPE_METADATA,
  PROVIDER_METADATA,
  SHARED_MODULE_METADATA,
} from './constants';

export class ReflectorFactory<T> {
  constructor(private readonly target?: T) {}

  public defineByKeys<T = object>(
    metadata: { [name: string]: any },
    target: T = this.target,
    exclude: string[] = [],
  ): T {
    Object.keys(metadata)
      .filter(p => !exclude.includes(p))
      .forEach(property => {
        Reflect.defineMetadata(property, metadata[property], target);
      });

    return target;
  }

  public get(metadataKey: string | symbol, target: Type<any> = this.target) {
    return Reflect.getMetadata(metadataKey, target) || [];
  }

  public set(
    metadataKey: string | symbol,
    metadataValue: any,
    target: Type<any> = this.target,
    propertyKey?: string | symbol,
  ) {
    Reflect.defineMetadata(metadataKey, metadataValue, target, propertyKey!);
  }

  public has(metadataKey: string | symbol, target: Type<any> = this.target) {
    return Reflect.hasMetadata(metadataKey, target);
  }

  public isGlobalModule(target: Type<NestModule> = this.target) {
    return Reflect.hasMetadata(SHARED_MODULE_METADATA, target);
  }

  public isProvider(target: Type<Provider | NestModule> = this.target) {
    return Reflect.hasMetadata(PROVIDER_METADATA, target);
  }

  public resolveProviderScope(provider: Type<Provider> = this.target) {
    return Reflect.getMetadata(SCOPE_METADATA, provider);
  }
}

export const Reflector = new ReflectorFactory<any>();
