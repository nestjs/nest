import type { BeforeApplicationShutdown } from '@nestjs/common';
import { isFunction, isNil } from '@nestjs/common/internal';
import { iterate } from 'iterare';
import { Module } from '../injector/module.js';
import { getInstancesGroupedByHierarchyLevel } from './utils/get-instances-grouped-by-hierarchy-level.js';
import { getSortedHierarchyLevels } from './utils/get-sorted-hierarchy-levels.js';

/**
 * Checks if the given instance has the `beforeApplicationShutdown` function
 *
 * @param instance The instance which should be checked
 */
function hasBeforeApplicationShutdownHook(
  instance: unknown,
): instance is BeforeApplicationShutdown {
  return isFunction(
    (instance as BeforeApplicationShutdown).beforeApplicationShutdown,
  );
}

/**
 * Calls the given instances
 */
function callOperator(instances: unknown[], signal?: string): Promise<any>[] {
  return iterate(instances)
    .filter(instance => !isNil(instance))
    .filter(hasBeforeApplicationShutdownHook)
    .map(async instance =>
      (instance as any as BeforeApplicationShutdown).beforeApplicationShutdown(
        signal,
      ),
    )
    .toArray();
}

/**
 * Calls the `beforeApplicationShutdown` function on the module and its children
 * (providers / controllers).
 *
 * @param moduleRef The module which will be initialized
 * @param signal The signal which caused the shutdown
 */
export async function callBeforeAppShutdownHook(
  moduleRef: Module,
  signal?: string,
): Promise<void> {
  const providers = moduleRef.getNonAliasProviders();
  const [_, moduleClassHost] = providers.shift()!;
  const groupedInstances = getInstancesGroupedByHierarchyLevel(
    moduleRef.controllers,
    moduleRef.injectables,
    moduleRef.middlewares,
    providers,
  );

  const levels = getSortedHierarchyLevels(groupedInstances, 'DESC');
  for (const level of levels) {
    await Promise.all(callOperator(groupedInstances.get(level)!, signal));
  }
  const moduleClassInstance = moduleClassHost.instance;
  if (
    moduleClassInstance &&
    hasBeforeApplicationShutdownHook(moduleClassInstance) &&
    moduleClassHost.isDependencyTreeStatic()
  ) {
    await moduleClassInstance.beforeApplicationShutdown(signal);
  }
}
