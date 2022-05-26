import { Injectable, OnModuleInit } from '@nestjs/common';

import { ASPECT } from './Aspect';
import { LazyDecorator } from './lazy-decorator.interface';
import { DiscoveryService } from '../discovery';
import { MetadataScanner } from '../metadata-scanner';
import { Reflector } from '../services';

@Injectable()
export class AutoAspectExecutor implements OnModuleInit {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
  ) {}

  onModuleInit() {
    const providers = this.discoveryService.getProviders();

    const lazyDecorators = this.lookupLazyDecorators(providers);

    if (lazyDecorators.length === 0) {
      return;
    }

    [...providers, ...this.discoveryService.getControllers()]
      .filter(wrapper => wrapper.isDependencyTreeStatic())
      .filter(({ instance }) => instance && Object.getPrototypeOf(instance))
      .forEach(({ instance }) => {
        this.metadataScanner.scanFromPrototype(
          instance,
          Object.getPrototypeOf(instance),
          methodName =>
            lazyDecorators.forEach(lazyDecorator => {
              const wrappedMethod = lazyDecorator.wrap(
                this.reflector,
                instance,
                methodName,
              );

              if (wrappedMethod) {
                instance[methodName] = wrappedMethod;
              }
            }),
        );
      });
  }

  private lookupLazyDecorators(providers: any[]): LazyDecorator[] {
    const { reflector } = this;

    return providers
      .filter(wrapper => wrapper.isDependencyTreeStatic())
      .filter(({ instance, metatype }) => {
        if (!instance || !metatype) {
          return false;
        }

        const aspect = reflector.get<string>(ASPECT, metatype);

        if (!aspect) {
          return false;
        }

        return instance.wrap && typeof instance.wrap === 'function';
      })
      .map(({ instance }) => instance);
  }
}
