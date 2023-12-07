import { DynamicModule, Type } from '@nestjs/common';
import { RuntimeException } from '@nestjs/core/errors/exceptions';

const kUniqueModuleId = Symbol('kUniqueModuleId');

export class UniqueDynamicModuleFactory {
  protected static readonly uniqueMap = new Map<string, string>();

  /**
   * You can use this method to avoid the hash algorithm during the DI compilation.
   *
   * Imagine you have a module that exports a provider, and that provider is
   * imported using `MyModule.forRoot('myToken')`, and you can get the reference of this provider using
   * injected using @Inject('myToken'). If you import this module twice, with different arguments on `.forRoot`,
   * in order to register both modules, we need to serialize and hash the dynamic module created by `.forRoot`.
   * Otherwise, it overrides the providers defined in the first import with the providers declared on the second import.
   *
   * This function tells the algorithm to skip the hash and directly use the `staticUniqueId`, and
   *you are responsible for making it unique.
   *
   * @param staticUniqueId The unique ID across all modules.
   * @param dynamicModule The dynamic module.
   *
   * @throws RuntimeException If the ID is already registered, an error will occur.
   */
  static wrap(staticUniqueId: string, dynamicModule: DynamicModule) {
    if (!this.uniqueMap.has(staticUniqueId)) {
      dynamicModule[
        kUniqueModuleId
      ] = `${dynamicModule.module.name}_${staticUniqueId}`;
      this.uniqueMap.set(staticUniqueId, dynamicModule.module.name);
      return dynamicModule;
    }

    throw new RuntimeException(
      `A module with this ID was already added before for "${
        this.uniqueMap.get(staticUniqueId).split('_')[0]
      }".`,
    );
  }
}

/**
 * Check if the given dynamic module was marked as unique.
 *
 * @param dynamicModule The dynamic module
 */
export function isUniqueDynamicModule(
  dynamicModule: DynamicModule | Type<any> | undefined,
): boolean {
  return dynamicModule && dynamicModule[kUniqueModuleId] !== undefined;
}

/**
 * Get the stored unique dynamic module id.
 *
 * @param dynamicModule The dynamic module
 */
export function getUniqueDynamicModuleId(
  dynamicModule: DynamicModule | Type<any>,
): string | undefined {
  return dynamicModule[kUniqueModuleId];
}
