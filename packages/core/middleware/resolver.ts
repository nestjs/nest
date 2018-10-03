import { MiddlewareContainer, MiddlewareWrapper } from './container';
import { Injector } from '../injector/injector';
import { Module } from '../injector/module';

export class MiddlewareResolver {
  private readonly instanceLoader = new Injector();

  constructor(private readonly middlewareContainer: MiddlewareContainer) {}

  public async resolveInstances(module: Module, moduleName: string) {
    const middleware = this.middlewareContainer.getMiddleware(moduleName);
    await Promise.all(
      [...middleware.values()].map(
        async wrapper => this.resolveMiddlewareInstance(wrapper, middleware, module),
      ),
    );
  }

  private async resolveMiddlewareInstance(
    wrapper: MiddlewareWrapper,
    middleware: Map<string, MiddlewareWrapper>,
    module: Module,
  ) {
    await this.instanceLoader.loadInstanceOfMiddleware(
      wrapper,
      middleware,
      module,
    );
  }
}
