import { GLOBAL_MODULE_METADATA } from '../../constants';

/**
 * @publicApi
 *
 * @description
 *
 * Makes the module global-scoped.
 * Once imported into any module, the global-scoped module will be visible
 * in all modules.
 *
 * @see [Global modules](https://docs.nestjs.com/modules#global-modules)
 *
 * @usageNotes
 *
 * `@Global()` makes the `CatsModule` global-scoped. The CatsService provider
 * will be ubiquitous, and modules that wish to inject the service will not need to import the CatsModule in their imports array.
 *
 * Note that the `imports` array is generally the preferred way to make a module's
 * API available to consumers.
 *
 * ```typescript
 * import { Module, Global } from '@nestjs/common';
 * import { CatsController } from './cats.controller';
 * import { CatsService } from './cats.service';
 *
 * @Global()
 * @Module({
 *   controllers: [CatsController],
 *   providers: [CatsService],
 *  exports: [CatsService],
 * })
 *
 * export class CatsModule {}
 * ```
 */
export function Global(): ClassDecorator {
  return (target: any) => {
    Reflect.defineMetadata(GLOBAL_MODULE_METADATA, true, target);
  };
}
