import { OnApplicationListen } from '@nestjs/common';
import { isNil } from '@nestjs/common/utils/shared.utils';
import iterate from 'iterare';
import { InstanceWrapper } from '../injector/instance-wrapper';
import { Module } from '../injector/module';
import {
  getNonTransientInstances,
  getTransientInstances,
} from '../injector/transient-instances';

/**
 * Checks if the given instance has the `OnApplicationListen` function
 *
 * @param instance The instance which should be checked
 */
function hasOnAppListenHook(
  instance: unknown,
): instance is OnApplicationListen {
  return !isNil((instance as OnApplicationListen).onApplicationListen);
}

/**
 * Calls the given instances
 */
function callOperator(instances: InstanceWrapper[]): Promise<any>[] {
  return iterate(instances)
    .filter(instance => !isNil(instance))
    .filter(hasOnAppListenHook)
    .map(async instance =>
      ((instance as any) as OnApplicationListen).onApplicationListen(),
    )
    .toArray();
}

/**
 * Calls the `OnApplicationListen` function on the module and its children
 * (providers / controllers).
 *
 * @param module The module which will be initialized
 */
export async function callModuleListenHook(module: Module): Promise<any> {
  const providers = [...module.providers];
  // Module (class) instance is the first element of the providers array
  // Lifecycle hook has to be called once all classes are properly initialized
  const [_, { instance: moduleClassInstance }] = providers.shift();
  const instances = [...module.controllers, ...providers];

  const nonTransientInstances = getNonTransientInstances(instances);
  await Promise.all(callOperator(nonTransientInstances));
  const transientInstances = getTransientInstances(instances);
  await Promise.all(callOperator(transientInstances));

  // Call the instance itself
  if (moduleClassInstance && hasOnAppListenHook(moduleClassInstance)) {
    await (moduleClassInstance as OnApplicationListen).onApplicationListen();
  }
}
