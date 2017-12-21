import { MiddlewaresContainer, MiddlewareWrapper } from './container';
import { Injector } from '../injector/injector';
import { Module } from '../injector/module';

export class MiddlewaresResolver {
  private readonly instanceLoader = new Injector();

  constructor(private readonly middlewaresContainer: MiddlewaresContainer) {}

  public async resolveInstances(module: Module, moduleName: string) {
    const middlewares = this.middlewaresContainer.getMiddlewares(moduleName);
    await Promise.all(
      [...middlewares.values()].map(
        async wrapper =>
          await this.resolveMiddlewareInstance(wrapper, middlewares, module),
      ),
    );
  }

  private async resolveMiddlewareInstance(
    wrapper: MiddlewareWrapper,
    middlewares: Map<string, MiddlewareWrapper>,
    module: Module,
  ) {
    await this.instanceLoader.loadInstanceOfMiddleware(
      wrapper,
      middlewares,
      module,
    );
  }
}
