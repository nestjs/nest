import {
  CustomDecorator,
  flatten,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { uid } from 'uid';
import { InstanceWrapper } from '../injector/instance-wrapper';
import { Module } from '../injector/module';
import { ModulesContainer } from '../injector/modules-container';
import { DiscoverableMetaHostCollection } from './discoverable-meta-host-collection';

/**
 * @publicApi
 */
export interface FilterByInclude {
  /**
   * List of modules to include (whitelist) into the discovery process.
   */
  include?: Function[];
}

/**
 * @publicApi
 */
export interface FilterByMetadataKey {
  /**
   * A key to filter controllers and providers by.
   * Only instance wrappers with the specified metadata key will be returned.
   */
  metadataKey?: string;
}

/**
 * @publicApi
 */
export type DiscoveryOptions = FilterByInclude | FilterByMetadataKey;

/**
 * @publicApi
 */
export type DiscoverableDecorator<T> = ((opts?: T) => CustomDecorator) & {
  KEY: string;
};

/**
 * @publicApi
 */
@Injectable()
export class DiscoveryService {
  constructor(private readonly modulesContainer: ModulesContainer) {}

  /**
   * Creates a decorator that can be used to decorate classes and methods with metadata.
   * The decorator will also add the class to the collection of discoverable classes (by metadata key).
   * Decorated classes can be discovered using the `getProviders` and `getControllers` methods.
   * @returns A decorator function.
   */
  static createDecorator<T>(): DiscoverableDecorator<T> {
    const metadataKey = uid(21);
    const decoratorFn =
      (opts: T) =>
      (target: object | Function, key?: string | symbol, descriptor?: any) => {
        if (!descriptor) {
          DiscoverableMetaHostCollection.addClassMetaHostLink(
            target as Function,
            metadataKey,
          );
        }
        SetMetadata(metadataKey, opts ?? {})(target, key!, descriptor);
      };

    decoratorFn.KEY = metadataKey;
    return decoratorFn as DiscoverableDecorator<T>;
  }

  /**
   * Returns an array of instance wrappers (providers).
   * Depending on the options, the array will contain either all providers or only providers with the specified metadata key.
   * @param options Discovery options.
   * @param modules A list of modules to filter by.
   * @returns An array of instance wrappers (providers).
   */
  public getProviders(
    options: DiscoveryOptions = {},
    modules: Module[] = this.getModules(options),
  ): InstanceWrapper[] {
    if ('metadataKey' in options) {
      const providers = DiscoverableMetaHostCollection.getProvidersByMetaKey(
        this.modulesContainer,
        options.metadataKey!,
      );
      return Array.from(providers);
    }

    const providers = modules.map(item => [...item.providers.values()]);
    return flatten(providers);
  }

  /**
   * Returns an array of instance wrappers (controllers).
   * Depending on the options, the array will contain either all controllers or only controllers with the specified metadata key.
   * @param options Discovery options.
   * @param modules A list of modules to filter by.
   * @returns An array of instance wrappers (controllers).
   */
  public getControllers(
    options: DiscoveryOptions = {},
    modules: Module[] = this.getModules(options),
  ): InstanceWrapper[] {
    if ('metadataKey' in options) {
      const controllers =
        DiscoverableMetaHostCollection.getControllersByMetaKey(
          this.modulesContainer,
          options.metadataKey!,
        );
      return Array.from(controllers);
    }

    const controllers = modules.map(item => [...item.controllers.values()]);
    return flatten(controllers);
  }

  /**
   * Retrieves metadata from the specified instance wrapper.
   * @param decorator The decorator to retrieve metadata of.
   * @param instanceWrapper Reference to the instance wrapper.
   * @param methodKey An optional method key to retrieve metadata from.
   * @returns Discovered metadata.
   */
  public getMetadataByDecorator<T extends DiscoverableDecorator<any>>(
    decorator: T,
    instanceWrapper: InstanceWrapper,
    methodKey?: string,
  ): T extends DiscoverableDecorator<infer R> ? R | undefined : T | undefined {
    if (methodKey) {
      return Reflect.getMetadata(
        decorator.KEY,
        instanceWrapper.instance[methodKey],
      );
    }

    const clsRef =
      instanceWrapper.instance?.constructor ?? instanceWrapper.metatype;
    return Reflect.getMetadata(decorator.KEY, clsRef);
  }

  /**
   * Returns a list of modules to be used for discovery.
   */
  protected getModules(options: DiscoveryOptions = {}): Module[] {
    const includeInOpts = 'include' in options;
    if (!includeInOpts) {
      const moduleRefs = [...this.modulesContainer.values()];
      return moduleRefs;
    }
    const whitelisted = this.includeWhitelisted(options.include!);
    return whitelisted;
  }

  private includeWhitelisted(include: Function[]): Module[] {
    const moduleRefs = [...this.modulesContainer.values()];
    return moduleRefs.filter(({ metatype }) =>
      include.some(item => item === metatype),
    );
  }
}
