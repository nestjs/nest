import { HttpServer } from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';
import { RequestMethod, VersioningType } from '@nestjs/common/enums';
import { InternalServerErrorException } from '@nestjs/common/exceptions';
import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { VersionValue } from '@nestjs/common/interfaces/version-options.interface';
import { Logger } from '@nestjs/common/services/logger.service';
import {
  addLeadingSlash,
  isUndefined,
} from '@nestjs/common/utils/shared.utils';
import { pathToRegexp } from 'path-to-regexp';
import { ApplicationConfig } from '../application-config';
import { UnknownRequestMappingException } from '../errors/exceptions/unknown-request-mapping.exception';
import { GuardsConsumer, GuardsContextCreator } from '../guards';
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
import { GraphInspector } from '../inspector/graph-inspector';
import {
  Entrypoint,
  HttpEntrypointMetadata,
} from '../inspector/interfaces/entrypoint.interface';
import {
  InterceptorsConsumer,
  InterceptorsContextCreator,
} from '../interceptors';
import { MetadataScanner } from '../metadata-scanner';
import { PipesConsumer, PipesContextCreator } from '../pipes';
import { ExceptionsFilter } from './interfaces/exceptions-filter.interface';
import { RoutePathMetadata } from './interfaces/route-path-metadata.interface';
import { PathsExplorer } from './paths-explorer';
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
  private readonly pathsExplorer: PathsExplorer;
  private readonly routerMethodFactory = new RouterMethodFactory();
  private readonly logger = new Logger(RouterExplorer.name, {
    timestamp: true,
  });
  private readonly exceptionFiltersCache = new WeakMap();

  constructor(
    metadataScanner: MetadataScanner,
    private readonly container: NestContainer,
    private readonly injector: Injector,
    private readonly routerProxy: RouterProxy,
    private readonly exceptionsFilter: ExceptionsFilter,
    config: ApplicationConfig,
    private readonly routePathFactory: RoutePathFactory,
    private readonly graphInspector: GraphInspector,
  ) {
    this.pathsExplorer = new PathsExplorer(metadataScanner);

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
    host: string | RegExp | Array<string | RegExp>,
    routePathMetadata: RoutePathMetadata,
  ) {
    const { instance } = instanceWrapper;
    const routerPaths = this.pathsExplorer.scanForPaths(instance);
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
      throw new UnknownRequestMappingException(metatype);
    }
    if (Array.isArray(path)) {
      return path.map(p => addLeadingSlash(p));
    }
    return [addLeadingSlash(path)];
  }

  public applyPathsToRouterProxy<T extends HttpServer>(
    router: T,
    routeDefinitions: RouteDefinition[],
    instanceWrapper: InstanceWrapper,
    moduleKey: string,
    routePathMetadata: RoutePathMetadata,
    host: string | RegExp | Array<string | RegExp>,
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
    host: string | RegExp | Array<string | RegExp>,
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
          this.container.getModuleByKey(moduleKey)!,
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
        routePathMetadata.versioningOptions!.type !== VersioningType.URI
      ) {
        // All versioning (except for URI Versioning) is done via the "Version Filter"
        routeHandler = this.applyVersionFilter(
          router,
          routePathMetadata,
          routeHandler,
        );
      }

      routePathMetadata.methodPath = path;
      const pathsToRegister = this.routePathFactory.create(
        routePathMetadata,
        requestMethod,
      );
      pathsToRegister.forEach(path => {
        const entrypointDefinition: Entrypoint<HttpEntrypointMetadata> = {
          type: 'http-endpoint',
          methodName,
          className: instanceWrapper.name,
          classNodeId: instanceWrapper.id,
          metadata: {
            key: path,
            path,
            requestMethod: RequestMethod[
              requestMethod
            ] as keyof typeof RequestMethod,
            methodVersion: routePathMetadata.methodVersion,
            controllerVersion: routePathMetadata.controllerVersion,
          },
        };

        this.copyMetadataToCallback(targetCallback, routeHandler);
        const normalizedPath = router.normalizePath
          ? router.normalizePath(path)
          : path;
        routerMethodRef(normalizedPath, routeHandler);

        this.graphInspector.insertEntrypointDefinition<HttpEntrypointMetadata>(
          entrypointDefinition,
          instanceWrapper.id,
        );
      });

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
            VERSIONED_ROUTE_MAPPED_MESSAGE(path, requestMethod, version!),
          );
        } else {
          this.logger.log(ROUTE_MAPPED_MESSAGE(path, requestMethod));
        }
      });
    });
  }

  private applyHostFilter(
    host: string | RegExp | Array<string | RegExp>,
    handler: Function,
  ) {
    if (!host) {
      return handler;
    }

    const httpAdapterRef = this.container.getHttpAdapterRef();
    const hosts = Array.isArray(host) ? host : [host];
    const hostRegExps = hosts.map((host: string | RegExp) => {
      if (typeof host === 'string') {
        try {
          return pathToRegexp(host);
        } catch (e) {
          if (e instanceof TypeError) {
            this.logger.error(
              `Unsupported host "${host}" syntax. In past releases, ?, *, and + were used to denote optional or repeating path parameters. The latest version of "path-to-regexp" now requires the use of named parameters. For example, instead of using a route like /users/* to capture all routes starting with "/users", you should use /users/*path. Please see the migration guide for more information.`,
            );
          }
          throw e;
        }
      }
      return { regexp: host, keys: [] };
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
          if (exp.keys.length > 0) {
            exp.keys.forEach((key, i) => (req.hosts[key.name] = match[i + 1]));
          } else if (exp.regexp && match.groups) {
            for (const groupName in match.groups) {
              req.hosts[groupName] = match.groups[groupName];
            }
          }
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

  private applyVersionFilter<T extends HttpServer>(
    router: T,
    routePathMetadata: RoutePathMetadata,
    handler: Function,
  ) {
    const version = this.routePathFactory.getVersion(routePathMetadata)!;
    return router.applyVersionFilter(
      handler,
      version,
      routePathMetadata.versioningOptions!,
    );
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

    const isTreeDurable = instanceWrapper.isDependencyTreeDurable();

    return async <TRequest extends Record<any, any>, TResponse>(
      req: TRequest,
      res: TResponse,
      next: () => void,
    ) => {
      try {
        const contextId = this.getContextId(req, isTreeDurable);
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
    isTreeDurable: boolean,
  ): ContextId {
    const contextId = ContextIdFactory.getByRequest(request);
    if (!request[REQUEST_CONTEXT_ID as any]) {
      Object.defineProperty(request, REQUEST_CONTEXT_ID, {
        value: contextId,
        enumerable: false,
        writable: false,
        configurable: false,
      });

      const requestProviderValue = isTreeDurable
        ? contextId.payload
        : Object.assign(request, contextId.payload);
      this.container.registerRequestProvider(requestProviderValue, contextId);
    }
    return contextId;
  }

  private copyMetadataToCallback(
    originalCallback: RouterProxyCallback,
    targetCallback: Function,
  ) {
    for (const key of Reflect.getMetadataKeys(originalCallback)) {
      Reflect.defineMetadata(
        key,
        Reflect.getMetadata(key, originalCallback),
        targetCallback,
      );
    }
  }
}
