import { Logger, OnApplicationBootstrap } from '@nestjs/common';
import { isFunction, isNil } from '@nestjs/common/utils/shared.utils';
import { iterate } from 'iterare';
import {
  getNonTransientInstances,
  getTransientInstances,
} from '../injector/helpers/transient-instances';
import { InstanceWrapper } from '../injector/instance-wrapper';
import { Module } from '../injector/module';

/**
 * Checks if the given instance has the `onApplicationBootstrap` function
 *
 * @param instance The instance which should be checked
 */
function hasOnAppBootstrapHook(
  instance: unknown,
): instance is OnApplicationBootstrap {
  return isFunction(
    (instance as OnApplicationBootstrap).onApplicationBootstrap,
  );
}

/**
 * Schedules hooks to run asynchronously without blocking
 */
function scheduleHooksAsynchronously(instances: InstanceWrapper[]): Promise<void> {
  return Promise.resolve().then(() => {
    iterate(instances)
      .filter(instance => !isNil(instance))
      .filter(hasOnAppBootstrapHook)
      .forEach(instance => {
        Promise.resolve().then(() => {
          (instance as any as OnApplicationBootstrap).onApplicationBootstrap()
            .catch(err => {
              Logger.error(
                'Error in onApplicationBootstrap hook', 
                err?.stack, 
                instance.name,
              );
            });
        });
      });
  });
}

/**
 * Calls the `onApplicationBootstrap` function on the module and its children
 * (providers / controllers) without blocking the application startup.
 *
 * @param module The module which will be initialized
 */
export async function callModuleBootstrapHook(module: Module): Promise<any> {
  const providers = module.getNonAliasProviders();
  // Module (class) instance is the first element of the providers array
  // Lifecycle hook has to be called once all classes are properly initialized
  const [_, moduleClassHost] = providers.shift()!;
  const instances = [
    ...module.controllers,
    ...providers,
    ...module.injectables,
    ...module.middlewares,
  ];

  const nonTransientInstances = getNonTransientInstances(instances);
  await scheduleHooksAsynchronously(nonTransientInstances);
  
  const transientInstances = getTransientInstances(instances);
  await scheduleHooksAsynchronously(transientInstances);

  // Call the instance itself
  const moduleClassInstance = moduleClassHost.instance;
  if (
    moduleClassInstance &&
    hasOnAppBootstrapHook(moduleClassInstance) &&
    moduleClassHost.isDependencyTreeStatic()
  ) {
    Promise.resolve().then(() => {
      moduleClassInstance.onApplicationBootstrap()
        .catch(err => {
          Logger.error(
            'Error in module onApplicationBootstrap hook', 
            err?.stack, 
            moduleClassHost.name,
          );
        });
    });
  }
}
