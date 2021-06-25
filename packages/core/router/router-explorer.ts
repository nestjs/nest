import { HttpServer } from '@nestjs/common';
import {
  METHOD_METADATA,
  PATH_METADATA,
  VERSION_METADATA,
} from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common/enums/request-method.enum';
import { VersioningType } from '@nestjs/common/enums/version-type.enum';
import { InternalServerErrorException } from '@nestjs/common/exceptions';
import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { Type } from '@nestjs/common/interfaces/type.interface';
import {
  VersionValue,
  VERSION_NEUTRAL,
} from '@nestjs/common/interfaces/version-options.interface';
import { Logger } from '@nestjs/common/services/logger.service';
import {
  addLeadingSlash,
  isString,
  isUndefined,
} from '@nestjs/common/utils/shared.utils';
import * as pathToRegexp from 'path-to-regexp';
import { ApplicationConfig } from '../application-config';
import { UnknownRequestMappingException } from '../errors/exceptions/unknown-request-mapping.exception';
import { GuardsConsumer } from '../guards/guards-consumer';
import { GuardsContextCreator } from '../guards/guards-context-creator';
import { ContextIdFactory } from '../helpers/context-id-factory';
import { ExecutionContextHost } from '../helpers/execution-context-host';
import {
  ROUTE_MAPPED_MESSAGE,
  VERSIONED_ROUTE_MAPPED_MESSAGE,
} from '../helpers/messages';
import { RouterMethodFactory } from '../helpers/router-method-factory';
import { STATIC_CONTEXT } from '../injector/constants';
import { NestContainer } from '../injector/container';
import { Injector } from '../injector/injector';
import { ContextId, InstanceWrapper } from '../injector/instance-wrapper';
import { Module } from '../injector/module';
import { InterceptorsConsumer } from '../interceptors/interceptors-consumer';
import { InterceptorsContextCreator } from '../interceptors/interceptors-context-creator';
import { MetadataScanner } from '../metadata-scanner';
import { PipesConsumer } from '../pipes/pipes-consumer';
import { PipesContextCreator } from '../pipes/pipes-context-creator';
import { ExceptionsFilter } from './interfaces/exceptions-filter.interface';
import { RoutePathMetadata } from './interfaces/route-path-metadata.interface';
import { REQUEST_CONTEXT_ID } from './request/request-constants';
import { RouteParamsFactory } from './route-params-factory';
import { RoutePathFactory } from './route-path-factory';
import { RouterExecutionContext } from './router-execution-context';
import { RouterProxy, RouterProxyCallback } from './router-proxy';

export interface RouteDefinition {
  path: string[];
  requestMethod: RequestMethod;
  targetCallback: RouterProxyCallback;
  methodName: string;
  version?: VersionValue;
}

export class RouterExplorer {
  private readonly executionContextCreator: RouterExecutionContext;
  private readonly routerMethodFactory = new RouterMethodFactory();
  private readonly logger = new Logger(RouterExplorer.name, {
    timestamp: true,
  });
  private readonly exceptionFiltersCache = new WeakMap();

  constructor(
    private readonly metadataScanner: MetadataScanner,
    private readonly container: NestContainer,
    private readonly injector?: Injector,
    private readonly routerProxy?: RouterProxy,
    private readonly exceptionsFilter?: ExceptionsFilter,
    private readonly config?: ApplicationConfig,
    private readonly routePathFactory?: RoutePathFactory,
  ) {
    const routeParamsFactory = new RouteParamsFactory();
    const pipesContextCreator = new PipesContextCreator(container, config);
    const pipesConsumer = new PipesConsumer();
    const guardsContextCreator = new GuardsContextCreator(container, config);
    const guardsConsumer = new GuardsConsumer();
    const interceptorsContextCreator = new InterceptorsContextCreator(
      container,
      config,
    );
    const interceptorsConsumer = new InterceptorsConsumer();

    this.executionContextCreator = new RouterExecutionContext(
      routeParamsFactory,
      pipesContextCreator,
      pipesConsumer,
      guardsContextCreator,
      guardsConsumer,
      interceptorsContextCreator,
      interceptorsConsumer,
      container.getHttpAdapterRef(),
    );
  }

  public explore<T extends HttpServer = any>(
    instanceWrapper: InstanceWrapper,
    moduleKey: string,
    applicationRef: T,
    host: string | string[],
    routePathMetadata: RoutePathMetadata,
  ) {
    const { instance } = instanceWrapper;
    const routerPaths = this.scanForPaths(instance);
    this.applyPathsToRouterProxy(
      applicationRef,
      routerPaths,
      instanceWrapper,
      moduleKey,
      routePathMetadata,
      host,
    );
  }

  public extractRouterPath(metatype: Type<Controller>): string[] {
    const path = Reflect.getMetadata(PATH_METADATA, metatype);

    if (isUndefined(path)) {
      throw new UnknownRequestMappingException();
    }
    if (Array.isArray(path)) {
      return path.map(p => addLeadingSlash(p));
    }
    return [addLeadingSlash(path)];
  }

  public scanForPaths(
    instance: Controller,
    prototype?: object,
  ): RouteDefinition[] {
    const instancePrototype = isUndefined(prototype)
      ? Object.getPrototypeOf(instance)
      : prototype;

    return this.metadataScanner.scanFromPrototype<Controller, RouteDefinition>(
      instance,
      instancePrototype,
      method => this.exploreMethodMetadata(instance, instancePrototype, method),
    );
  }

  public exploreMethodMetadata(
    instance: Controller,
    prototype: object,
    methodName: string,
  ): RouteDefinition {
    const instanceCallback = instance[methodName];
    const prototypeCallback = prototype[methodName];
    const routePath = Reflect.getMetadata(PATH_METADATA, prototypeCallback);
    if (isUndefined(routePath)) {
      return null;
    }
    const requestMethod: RequestMethod = Reflect.getMetadata(
      METHOD_METADATA,
      prototypeCallback,
    );
    const version: VersionValue | undefined = Reflect.getMetadata(
      VERSION_METADATA,
      prototypeCallback,
    );
    const path = isString(routePath)
      ? [addLeadingSlash(routePath)]
      : routePath.map((p: string) => addLeadingSlash(p));

    return {
      path,
      requestMethod,
      targetCallback: instanceCallback,
      methodName,
      version,
    };
  }

  public applyPathsToRouterProxy<T extends HttpServer>(
    router: T,
    routeDefinitions: RouteDefinition[],
    instanceWrapper: InstanceWrapper,
    moduleKey: string,
    routePathMetadata: RoutePathMetadata,
    host: string | string[],
  ) {
    (routeDefinitions || []).forEach(routeDefinition => {
      const { version: methodVersion } = routeDefinition;
      routePathMetadata.methodVersion = methodVersion;

      this.applyCallbackToRouter(
        router,
        routeDefinition,
        instanceWrapper,
        moduleKey,
        routePathMetadata,
        host,
      );
    });
  }

  private applyCallbackToRouter<T extends HttpServer>(
    router: T,
    routeDefinition: RouteDefinition,
    instanceWrapper: InstanceWrapper,
    moduleKey: string,
    routePathMetadata: RoutePathMetadata,
    host: string | string[],
  ) {
    const {
      path: paths,
      requestMethod,
      targetCallback,
      methodName,
    } = routeDefinition;

    const { instance } = instanceWrapper;
    const routerMethodRef = this.routerMethodFactory
      .get(router, requestMethod)
      .bind(router);

    const isRequestScoped = !instanceWrapper.isDependencyTreeStatic();
    const proxy = isRequestScoped
      ? this.createRequestScopedHandler(
          instanceWrapper,
          requestMethod,
          this.container.getModuleByKey(moduleKey),
          moduleKey,
          methodName,
        )
      : this.createCallbackProxy(
          instance,
          targetCallback,
          methodName,
          moduleKey,
          requestMethod,
        );

    const isVersioned =
      (routePathMetadata.methodVersion ||
        routePathMetadata.controllerVersion) &&
      routePathMetadata.versioningOptions;
    let routeHandler = this.applyHostFilter(host, proxy);

    paths.forEach(path => {
      if (
        isVersioned &&
        routePathMetadata.versioningOptions.type !== VersioningType.URI
      ) {
        // All versioning (except for URI Versioning) is done via the "Version Filter"
        routeHandler = this.applyVersionFilter(routePathMetadata, routeHandler);
      }

      routePathMetadata.methodPath = path;
      const pathsToRegister = this.routePathFactory.create(
        routePathMetadata,
        requestMethod,
      );
      pathsToRegister.forEach(path => routerMethodRef(path, routeHandler));

      const pathsToLog = this.routePathFactory.create(
        {
          ...routePathMetadata,
          versioningOptions: undefined,
        },
        requestMethod,
      );
      pathsToLog.forEach(path => {
        if (isVersioned) {
          const version = this.routePathFactory.getVersion(routePathMetadata);
          this.logger.log(
            VERSIONED_ROUTE_MAPPED_MESSAGE(path, requestMethod, version),
          );
        } else {
          this.logger.log(ROUTE_MAPPED_MESSAGE(path, requestMethod));
        }
      });
    });
  }

  private applyHostFilter(host: string | string[], handler: Function) {
    if (!host) {
      return handler;
    }

    const httpAdapterRef = this.container.getHttpAdapterRef();
    const hosts = Array.isArray(host) ? host : [host];
    const hostRegExps = hosts.map((host: string) => {
      const keys = [];
      const regexp = pathToRegexp(host, keys);
      return { regexp, keys };
    });

    const unsupportedFilteringErrorMessage = Array.isArray(host)
      ? `HTTP adapter does not support filtering on hosts: ["${host.join(
          '", "',
        )}"]`
      : `HTTP adapter does not support filtering on host: "${host}"`;

    return <TRequest extends Record<string, any> = any, TResponse = any>(
      req: TRequest,
      res: TResponse,
      next: () => void,
    ) => {
      (req as Record<string, any>).hosts = {};
      const hostname = httpAdapterRef.getRequestHostname(req) || '';

      for (const exp of hostRegExps) {
        const match = hostname.match(exp.regexp);
        if (match) {
          exp.keys.forEach((key, i) => (req.hosts[key.name] = match[i + 1]));
          return handler(req, res, next);
        }
      }
      if (!next) {
        throw new InternalServerErrorException(
          unsupportedFilteringErrorMessage,
        );
      }
      return next();
    };
  }

  private applyVersionFilter(
    routePathMetadata: RoutePathMetadata,
    handler: Function,
  ) {
    const { versioningOptions } = routePathMetadata;
    const version = this.routePathFactory.getVersion(routePathMetadata);

    return <TRequest extends Record<string, any> = any, TResponse = any>(
      req: TRequest,
      res: TResponse,
      next: () => void,
    ) => {
      if (version === VERSION_NEUTRAL) {
        return handler(req, res, next);
      }
      // URL Versioning is done via the path, so the filter continues forward
      if (versioningOptions.type === VersioningType.URI) {
        return handler(req, res, next);
      }
      // Media Type (Accept Header) Versioning Handler
      if (versioningOptions.type === VersioningType.MEDIA_TYPE) {
        const MEDIA_TYPE_HEADER = 'Accept';
        const acceptHeaderValue: string | undefined =
          req.headers?.[MEDIA_TYPE_HEADER] ||
          req.headers?.[MEDIA_TYPE_HEADER.toLowerCase()];

        const acceptHeaderVersionParameter = acceptHeaderValue
          ? acceptHeaderValue.split(';')[1]
          : '';

        if (acceptHeaderVersionParameter) {
          const headerVersion = acceptHeaderVersionParameter.split(
            versioningOptions.key,
          )[1];

          if (Array.isArray(version)) {
            if (version.includes(headerVersion)) {
              return handler(req, res, next);
            }
          } else if (isString(version)) {
            if (version === headerVersion) {
              return handler(req, res, next);
            }
          }
        }
      }
      // Header Versioning Handler
      else if (versioningOptions.type === VersioningType.HEADER) {
        const customHeaderVersionParameter: string | undefined =
          req.headers?.[versioningOptions.header] ||
          req.headers?.[versioningOptions.header.toLowerCase()];

        if (customHeaderVersionParameter) {
          if (Array.isArray(version)) {
            if (version.includes(customHeaderVersionParameter)) {
              return handler(req, res, next);
            }
          } else if (isString(version)) {
            if (version === customHeaderVersionParameter) {
              return handler(req, res, next);
            }
          }
        }
      }

      if (!next) {
        throw new InternalServerErrorException(
          'HTTP adapter does not support filtering on version',
        );
      }
      return next();
    };
  }

  private createCallbackProxy(
    instance: Controller,
    callback: RouterProxyCallback,
    methodName: string,
    moduleRef: string,
    requestMethod: RequestMethod,
    contextId = STATIC_CONTEXT,
    inquirerId?: string,
  ) {
    const executionContext = this.executionContextCreator.create(
      instance,
      callback,
      methodName,
      moduleRef,
      requestMethod,
      contextId,
      inquirerId,
    );
    const exceptionFilter = this.exceptionsFilter.create(
      instance,
      callback,
      moduleRef,
      contextId,
      inquirerId,
    );
    return this.routerProxy.createProxy(executionContext, exceptionFilter);
  }

  public createRequestScopedHandler(
    instanceWrapper: InstanceWrapper,
    requestMethod: RequestMethod,
    moduleRef: Module,
    moduleKey: string,
    methodName: string,
  ) {
    const { instance } = instanceWrapper;
    const collection = moduleRef.controllers;
    return async <TRequest extends Record<any, any>, TResponse>(
      req: TRequest,
      res: TResponse,
      next: () => void,
    ) => {
      try {
        const contextId = this.getContextId(req);
        const contextInstance = await this.injector.loadPerContext(
          instance,
          moduleRef,
          collection,
          contextId,
        );
        await this.createCallbackProxy(
          contextInstance,
          contextInstance[methodName],
          methodName,
          moduleKey,
          requestMethod,
          contextId,
          instanceWrapper.id,
        )(req, res, next);
      } catch (err) {
        let exceptionFilter = this.exceptionFiltersCache.get(
          instance[methodName],
        );
        if (!exceptionFilter) {
          exceptionFilter = this.exceptionsFilter.create(
            instance,
            instance[methodName],
            moduleKey,
          );
          this.exceptionFiltersCache.set(instance[methodName], exceptionFilter);
        }
        const host = new ExecutionContextHost([req, res, next]);
        exceptionFilter.next(err, host);
      }
    };
  }

  private getContextId<T extends Record<any, unknown> = any>(
    request: T,
  ): ContextId {
    const contextId = ContextIdFactory.getByRequest(request);
    if (!request[REQUEST_CONTEXT_ID as any]) {
      Object.defineProperty(request, REQUEST_CONTEXT_ID, {
        value: contextId,
        enumerable: false,
        writable: false,
        configurable: false,
      });
      this.container.registerRequestProvider(request, contextId);
    }
    return contextId;
  }
}
