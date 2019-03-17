import { OnApplicationShutdown } from '@nestjs/common';
import { isNil, isUndefined } from '@nestjs/common/utils/shared.utils';
import iterate from 'iterare';
import { InstanceWrapper } from '../injector/instance-wrapper';
import { Module } from '../injector/module';
import {
  getNonTransientInstances,
  getTransientInstances,
} from '../injector/transient-instances';

/**
 * Checks if the given instance has the `onApplicationShutdown` function
 *
 * @param instance The instance which should be checked
 */
function hasOnAppBootstrapHook(
  instance: unknown,
): instance is OnApplicationShutdown {
  return !isUndefined(
    (instance as OnApplicationShutdown).onApplicationShutdown,
  );
}

/**
 * Calls the given instances
 */
function callOperator(
  instances: InstanceWrapper[],
  signal?: string,
): Promise<any>[] {
  return iterate(instances)
    .filter(instance => !isNil(instance))
    .filter(hasOnAppBootstrapHook)
    .map(async instance =>
      ((instance as any) as OnApplicationShutdown).onApplicationShutdown(
        signal,
      ),
    )
    .toArray();
}

/**
 * Calls the `onApplicationShutdown` function on the module and its children
 * (providers / controllers).
 *
 * @param module The module which will be initialized
 */
export async function callAppShutdownHook(
  module: Module,
  signal?: string,
): Promise<any> {
  const providers = [...module.providers];
  // Module (class) instance is the first element of the providers array
  // Lifecycle hook has to be called once all classes are properly initialized
  const [_, { instance: moduleClassInstance }] = providers.shift();
  const instances = [...module.controllers, ...providers];

  const nonTransientInstances = getNonTransientInstances(instances);
  await Promise.all(callOperator(nonTransientInstances, signal));
  const transientInstances = getTransientInstances(instances);
  await Promise.all(callOperator(transientInstances, signal));

  // Call the instance itself
  if (moduleClassInstance && hasOnAppBootstrapHook(moduleClassInstance)) {
    await (moduleClassInstance as OnApplicationShutdown).onApplicationShutdown(
      signal,
    );
  }
}
