import { Injector } from '../injector/injector';
import { InstanceWrapper } from '../injector/instance-wrapper';
import { Module } from '../injector/module';
import { MiddlewareContainer } from './container';

export class MiddlewareResolver {
  private readonly instanceLoader = new Injector();

  constructor(private readonly middlewareContainer: MiddlewareContainer) {}

  public async resolveInstances(module: Module, moduleName: string) {
    const middleware = this.middlewareContainer.getMiddlewareCollection(
      moduleName,
    );
    await Promise.all(
      [...middleware.values()].map(async wrapper =>
        this.resolveMiddlewareInstance(wrapper, middleware, module),
      ),
    );
  }

  private async resolveMiddlewareInstance(
    wrapper: InstanceWrapper,
    middleware: Map<string, InstanceWrapper>,
    module: Module,
  ) {
    await this.instanceLoader.loadMiddleware(wrapper, middleware, module);
  }
}
