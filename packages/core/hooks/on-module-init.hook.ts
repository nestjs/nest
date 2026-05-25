import type { OnModuleInit } from '@nestjs/common';
import { isFunction, isNil } from '@nestjs/common/internal';
import { iterate } from 'iterare';
import { Module } from '../injector/module.js';
import { getInstancesGroupedByHierarchyLevel } from './utils/get-instances-grouped-by-hierarchy-level.js';
import { getSortedHierarchyLevels } from './utils/get-sorted-hierarchy-levels.js';

/**
 * Returns true or false if the given instance has a `onModuleInit` function
 *
 * @param instance The instance which should be checked
 */
function hasOnModuleInitHook(instance: unknown): instance is OnModuleInit {
  return isFunction((instance as OnModuleInit).onModuleInit);
}

/**
 * Calls the given instances
 */
function callOperator(instances: unknown[]): Promise<any>[] {
  return iterate(instances)
    .filter(instance => !isNil(instance))
    .filter(hasOnModuleInitHook)
    .map(async instance => (instance as any as OnModuleInit).onModuleInit())
    .toArray();
}

/**
 * Calls the `onModuleInit` function on the module and its children
 * (providers / controllers).
 *
 * @param moduleRef The module which will be initialized
 */
export async function callModuleInitHook(moduleRef: Module): Promise<void> {
  const providers = moduleRef.getNonAliasProviders();
  // Module (class) instance is the first element of the providers array
  // Lifecycle hook has to be called once all classes are properly initialized
  const [_, moduleClassHost] = providers.shift()!;

  const groupedInstances = getInstancesGroupedByHierarchyLevel(
    moduleRef.controllers,
    moduleRef.injectables,
    moduleRef.middlewares,
    providers,
  );

  const levels = getSortedHierarchyLevels(groupedInstances);
  for (const level of levels) {
    await Promise.all(callOperator(groupedInstances.get(level)!));
  }

  // Call the instance itself
  const moduleClassInstance = moduleClassHost.instance;
  if (
    moduleClassInstance &&
    hasOnModuleInitHook(moduleClassInstance) &&
    moduleClassHost.isDependencyTreeStatic()
  ) {
    await moduleClassInstance.onModuleInit();
  }
}
