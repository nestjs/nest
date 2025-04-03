import { OnModuleDestroy } from '@nestjs/common';
import { isFunction, isNil } from '@nestjs/common/utils/shared.utils';
import { iterate } from 'iterare';
import { Module } from '../injector/module';
import { getInstancesGroupedByHierarchyLevel } from './utils/get-instances-grouped-by-hierarchy-level';
import { getSortedHierarchyLevels } from './utils/get-sorted-hierarchy-levels';

/**
 * Returns true or false if the given instance has a `onModuleDestroy` function
 *
 * @param instance The instance which should be checked
 */
function hasOnModuleDestroyHook(
  instance: unknown,
): instance is OnModuleDestroy {
  return isFunction((instance as OnModuleDestroy).onModuleDestroy);
}

/**
 * Calls the given instances onModuleDestroy hook
 */
function callOperator(instances: unknown[]): Promise<any>[] {
  return iterate(instances)
    .filter(instance => !isNil(instance))
    .filter(hasOnModuleDestroyHook)
    .map(async instance =>
      (instance as any as OnModuleDestroy).onModuleDestroy(),
    )
    .toArray();
}

/**
 * Calls the `onModuleDestroy` function on the module and its children
 * (providers / controllers).
 *
 * @param moduleRef The module which will be initialized
 */
export async function callModuleDestroyHook(moduleRef: Module): Promise<any> {
  const providers = moduleRef.getNonAliasProviders();
  // Module (class) instance is the first element of the providers array
  // Lifecycle hook has to be called once all classes are properly destroyed
  const [_, moduleClassHost] = providers.shift()!;
  const groupedInstances = getInstancesGroupedByHierarchyLevel(
    moduleRef.controllers,
    moduleRef.injectables,
    moduleRef.middlewares,
    providers,
  );

  const levels = getSortedHierarchyLevels(groupedInstances, 'DESC');
  for (const level of levels) {
    await Promise.all(callOperator(groupedInstances.get(level)!));
  }

  // Call the module instance itself
  const moduleClassInstance = moduleClassHost.instance;
  if (
    moduleClassInstance &&
    hasOnModuleDestroyHook(moduleClassInstance) &&
    moduleClassHost.isDependencyTreeStatic()
  ) {
    await moduleClassInstance.onModuleDestroy();
  }
}
