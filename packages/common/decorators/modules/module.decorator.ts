import { METADATA as metadataConstants } from '../../constants';
import { ModuleMetadata } from '../../interfaces/modules/module-metadata.interface';
import { InvalidModuleConfigException } from './exceptions/invalid-module-config.exception';

const metadataKeys = [
  metadataConstants.IMPORTS,
  metadataConstants.EXPORTS,
  metadataConstants.CONTROLLERS,
  metadataConstants.PROVIDERS,
];

const validateKeys = (keys: string[]) => {

  const validateKey = (key: string) => {
    if (metadataKeys.includes(key)) {
      return;
    }
    throw new InvalidModuleConfigException(key);
  };
  keys.forEach(validateKey);
};

/**
 * Decorator that marks a class as a [module](https://docs.nestjs.com/modules). Modules are used by
 * Nest to organize the application structure into scopes. Controllers and
 * Providers are scoped by the module they are declared in.  Modules and their
 * classes (Controllers and Providers) form a graph that determines how Nest
 * performs [Dependency Injection (DI)](https://docs.nestjs.com/providers#dependency-injection).
 *
 * @see [Modules](https://docs.nestjs.com/modules)
 *
 * @usageNotes
 * The following example:
 * - declares `CatsController` as a controller to be instantiated when the
 *   `CatsModule` is bootstrapped
 * - declares `CatsService` as a provider that can be injected within the
 *   module scope of the `CatsModule`
 * - exports `CatsService` so that any module that imports `CatsModule`
 *   may inject `CatsService`
 *
 * ```typescript
 * import { Module } from '@nestjs/common';
 * import { CatsController } from './cats.controller';
 * import { CatsService } from './cats.service';
 *
 * @Module({
 *   controllers: [CatsController],
 *   providers: [CatsService],
 *   exports: [CatsService]
 * })
 * export class CatsModule {}
 * ```
 * 
 * @publicApi
 */
export function Module(metadata: ModuleMetadata): ClassDecorator {
  const propsKeys = Object.keys(metadata);
  validateKeys(propsKeys);

  return (target: object) => {
    for (const property in metadata) {
      if (metadata.hasOwnProperty(property)) {
        Reflect.defineMetadata(property, (metadata as any)[property], target);
      }
    }
  };
}
