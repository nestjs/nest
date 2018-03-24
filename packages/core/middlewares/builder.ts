import { MiddlewareConfiguration } from '@nestjs/common/interfaces/middlewares/middleware-configuration.interface';
import { InvalidMiddlewareConfigurationException } from '../errors/exceptions/invalid-middleware-configuration.exception';
import {
  isUndefined,
  isNil,
  isFunction,
} from '@nestjs/common/utils/shared.utils';
import { BindResolveMiddlewareValues } from '@nestjs/common/utils/bind-resolve-values.util';
import { Logger } from '@nestjs/common/services/logger.service';
import { Type, MiddlewaresConsumer, RequestMappingMetadata } from '@nestjs/common/interfaces';
import { MiddlewareConfigProxy } from '@nestjs/common/interfaces/middlewares';
import { RoutesMapper } from './routes-mapper';
import { NestMiddleware } from '@nestjs/common';
import { filterMiddlewares } from './utils';
import { flatten } from '@nestjs/common/decorators/core/dependencies.decorator'

export class MiddlewareBuilder implements MiddlewaresConsumer {
  private readonly middlewaresCollection = new Set<MiddlewareConfiguration>();
  private readonly logger = new Logger(MiddlewareBuilder.name);

  constructor(private readonly routesMapper: RoutesMapper) {}

  public apply(...middlewares: Array<Type<any> | Function | any>): MiddlewareConfigProxy {
    return new MiddlewareBuilder.ConfigProxy(this, flatten(middlewares));
  }

  public build() {
    return [...this.middlewaresCollection];
  }

  private bindValuesToResolve(
    middlewares: Type<any> | Type<any>[],
    resolveParams: any[],
  ) {
    if (isNil(resolveParams)) {
      return middlewares;
    }
    const bindArgs = BindResolveMiddlewareValues(resolveParams);
    return [].concat(middlewares).map(bindArgs);
  }

  private static ConfigProxy = class implements MiddlewareConfigProxy {
    private contextParameters = null;
    private includedRoutes: any[];

    constructor(private readonly builder: MiddlewareBuilder, middlewares) {
      this.includedRoutes = filterMiddlewares(middlewares);
    }

    public with(...args): MiddlewareConfigProxy {
      this.contextParameters = args;
      return this;
    }

    public forRoutes(...routes: Array<Type<any> | RequestMappingMetadata | string>): MiddlewaresConsumer {
      const {
        middlewaresCollection,
        bindValuesToResolve,
        routesMapper,
      } = this.builder;

      const forRoutes = this.mapRoutesToFlatList(
        routes.map(route => routesMapper.mapRouteToRouteProps(route)),
      );
      const configuration = {
        middlewares: bindValuesToResolve(this.includedRoutes, this.contextParameters),
        forRoutes,
      };
      middlewaresCollection.add(configuration);
      return this.builder;
    }

    private mapRoutesToFlatList(forRoutes) {
      return forRoutes.reduce((a, b) => a.concat(b));
    }
  };
}
