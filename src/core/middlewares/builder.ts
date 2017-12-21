import { MiddlewareConfiguration } from '@nestjs/common/interfaces/middlewares/middleware-configuration.interface';
import { InvalidMiddlewareConfigurationException } from '../errors/exceptions/invalid-middleware-configuration.exception';
import {
  isUndefined,
  isNil,
  isFunction
} from '@nestjs/common/utils/shared.utils';
import { BindResolveMiddlewareValues } from '@nestjs/common/utils/bind-resolve-values.util';
import { Logger } from '@nestjs/common/services/logger.service';
import { Metatype, MiddlewaresConsumer } from '@nestjs/common/interfaces';
import { MiddlewareConfigProxy } from '@nestjs/common/interfaces/middlewares';
import { RoutesMapper } from './routes-mapper';
import { NestMiddleware } from '@nestjs/common';
import { filterMiddlewares } from './utils';

export class MiddlewareBuilder implements MiddlewaresConsumer {
  private readonly middlewaresCollection = new Set<MiddlewareConfiguration>();
  private readonly logger = new Logger(MiddlewareBuilder.name);

  constructor(private readonly routesMapper: RoutesMapper) {}

  public apply(middlewares: any | any[]): MiddlewareConfigProxy {
    return new MiddlewareBuilder.ConfigProxy(this, middlewares);
  }

  /**
   * @deprecated
   * Since version RC.6 this method is deprecated. Use apply() instead.
   */
  public use(configuration: MiddlewareConfiguration) {
    this.logger.warn(
      'DEPRECATED! Since version RC.6 `use()` method is deprecated. Use `apply()` instead.'
    );

    const { middlewares, forRoutes } = configuration;
    if (isUndefined(middlewares) || isUndefined(forRoutes)) {
      throw new InvalidMiddlewareConfigurationException();
    }

    this.middlewaresCollection.add(configuration);
    return this;
  }

  public build() {
    return [...this.middlewaresCollection];
  }

  private bindValuesToResolve(
    middlewares: Metatype<any> | Metatype<any>[],
    resolveParams: any[]
  ) {
    if (isNil(resolveParams)) {
      return middlewares;
    }
    const bindArgs = BindResolveMiddlewareValues(resolveParams);
    return [].concat(middlewares).map(bindArgs);
  }

  private static ConfigProxy = class implements MiddlewareConfigProxy {
    private contextArgs = null;
    private includedRoutes: any[];

    constructor(private readonly builder: MiddlewareBuilder, middlewares) {
      this.includedRoutes = filterMiddlewares(middlewares);
    }

    public with(...args): MiddlewareConfigProxy {
      this.contextArgs = args;
      return this;
    }

    public forRoutes(...routes): MiddlewaresConsumer {
      const {
        middlewaresCollection,
        bindValuesToResolve,
        routesMapper
      } = this.builder;

      const forRoutes = this.mapRoutesToFlatList(
        routes.map(route => routesMapper.mapRouteToRouteProps(route))
      );
      const configuration = {
        middlewares: bindValuesToResolve(this.includedRoutes, this.contextArgs),
        forRoutes
      };
      middlewaresCollection.add(configuration);
      return this.builder;
    }

    private mapRoutesToFlatList(forRoutes) {
      return forRoutes.reduce((a, b) => a.concat(b));
    }
  };
}
