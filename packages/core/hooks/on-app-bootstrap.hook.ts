import { OnApplicationBootstrap } from '@nestjs/common';
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
 * Creates non-blocking promises for all instances
 */
function createNonBlockingPromises(instances: InstanceWrapper[]): Promise<void> {
  // We wrap the original callOperator in Promise.resolve to ensure it doesn't block
  return Promise.resolve().then(() => {
    // Start all hooks but don't wait for their completion
    iterate(instances)
      .filter(instance => !isNil(instance))
      .filter(hasOnAppBootstrapHook)
      .forEach(instance => {
        // Use Promise.resolve to ensure these run asynchronously
        Promise.resolve().then(() => {
          // Error handling to prevent unhandled rejections
          (instance as any as OnApplicationBootstrap).onApplicationBootstrap()
            .catch(err => console.error('Error in onApplicationBootstrap hook:', err));
        });
      });
  });
}

/**
 * Calls the `onApplicationBootstrap` function on the module and its children
 * (providers / controllers) asynchronously.
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
  await createNonBlockingPromises(nonTransientInstances);
  
  const transientInstances = getTransientInstances(instances);
  await createNonBlockingPromises(transientInstances);

  // Call the instance itself
  const moduleClassInstance = moduleClassHost.instance;
  if (
    moduleClassInstance &&
    hasOnAppBootstrapHook(moduleClassInstance) &&
    moduleClassHost.isDependencyTreeStatic()
  ) {
    // Use Promise.resolve to make the module class hook non-blocking too
    Promise.resolve().then(() => {
      moduleClassInstance.onApplicationBootstrap()
        .catch(err => console.error('Error in module onApplicationBootstrap hook:', err));
    });
  }
}
