import { flatten } from '@nestjs/common/decorators/core/dependencies.decorator';
import { MiddlewareConsumer, Type } from '@nestjs/common/interfaces';
import { MiddlewareConfigProxy } from '@nestjs/common/interfaces/middleware';
import { MiddlewareConfiguration } from '@nestjs/common/interfaces/middleware/middleware-configuration.interface';
import { BindResolveMiddlewareValues } from '@nestjs/common/utils/bind-resolve-values.util';
import { isNil } from '@nestjs/common/utils/shared.utils';
import { RoutesMapper } from './routes-mapper';
import { filterMiddleware } from './utils';

export class MiddlewareBuilder implements MiddlewareConsumer {
  private readonly middlewareCollection = new Set<MiddlewareConfiguration>();
  constructor(private readonly routesMapper: RoutesMapper) {}

  public apply(
    ...middleware: Array<Type<any> | Function | any>,
  ): MiddlewareConfigProxy {
    return new MiddlewareBuilder.ConfigProxy(this, flatten(middleware));
  }

  public build() {
    return [...this.middlewareCollection];
  }

  private bindValuesToResolve(
    middleware: Type<any> | Type<any>[],
    resolveParams: any[],
  ) {
    if (isNil(resolveParams)) {
      return middleware;
    }
    const bindArgs = BindResolveMiddlewareValues(resolveParams);
    return [].concat(middleware).map(bindArgs);
  }

  private static ConfigProxy = class implements MiddlewareConfigProxy {
    private contextParameters = null;
    private includedRoutes: any[];

    constructor(private readonly builder: MiddlewareBuilder, middleware) {
      this.includedRoutes = filterMiddleware(middleware);
    }

    public with(...args): MiddlewareConfigProxy {
      this.contextParameters = args;
      return this;
    }

    public forRoutes(
      ...routes: Array<string | any>,
    ): MiddlewareConsumer {
      const {
        middlewareCollection,
        bindValuesToResolve,
        routesMapper,
      } = this.builder;

      const forRoutes = this.mapRoutesToFlatList(
        routes.map(route => routesMapper.mapRouteToRouteProps(route)),
      );
      const configuration = {
        middleware: bindValuesToResolve(
          this.includedRoutes,
          this.contextParameters,
        ),
        forRoutes,
      };
      middlewareCollection.add(configuration);
      return this.builder;
    }

    private mapRoutesToFlatList(forRoutes) {
      return forRoutes.reduce((a, b) => a.concat(b));
    }
  };
}
