import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { isUndefined } from '@nestjs/common/utils/shared.utils';
import { ContextIdFactory } from '@nestjs/core/helpers/context-id-factory';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { STATIC_CONTEXT } from '@nestjs/core/injector/constants';
import { NestContainer } from '@nestjs/core/injector/container';
import { Injector } from '@nestjs/core/injector/injector';
import {
  ContextId,
  InstanceWrapper,
} from '@nestjs/core/injector/instance-wrapper';
import { Module } from '@nestjs/core/injector/module';
import { GraphInspector } from '@nestjs/core/inspector/graph-inspector';
import { MetadataScanner } from '@nestjs/core/metadata-scanner';
import { REQUEST_CONTEXT_ID } from '@nestjs/core/router/request/request-constants';
import {
  catchError,
  defaultIfEmpty,
  forkJoin,
  from as fromPromise,
  isObservable,
  map,
  mergeMap,
  Observable,
  ObservedValueOf,
  of,
} from 'rxjs';
import { IClientProxyFactory } from './client/client-proxy-factory';
import { ClientsContainer } from './container';
import { ExceptionFiltersContext } from './context/exception-filters-context';
import { RequestContextHost } from './context/request-context-host';
import { RpcContextCreator } from './context/rpc-context-creator';
import { handleExceptionFilterFailure } from './context/rpc-proxy';
import {
  DEFAULT_CALLBACK_METADATA,
  DEFAULT_GRPC_CALLBACK_METADATA,
} from './context/rpc-metadata-constants';
import { BaseRpcContext } from './ctx-host/base-rpc.context';
import { Transport } from './enums';
import { RpcExceptionsHandler } from './exceptions/rpc-exceptions-handler';
import { MessageHandler, PatternMetadata, RequestContext } from './interfaces';
import { MicroserviceEntrypointMetadata } from './interfaces/microservice-entrypoint-metadata.interface';
import {
  EventOrMessageListenerDefinition,
  ListenerMetadataExplorer,
} from './listener-metadata-explorer';
import { ServerGrpc } from './server';
import { Server } from './server/server';

type SettledHandlerResult =
  | { hasFailed: false; value: unknown }
  | { hasFailed: true; error: unknown };

export class ListenersController {
  private readonly metadataExplorer = new ListenerMetadataExplorer(
    new MetadataScanner(),
  );
  private readonly exceptionFiltersCache = new WeakMap();

  constructor(
    private readonly clientsContainer: ClientsContainer,
    private readonly contextCreator: RpcContextCreator,
    private readonly container: NestContainer,
    private readonly injector: Injector,
    private readonly clientFactory: IClientProxyFactory,
    private readonly exceptionFiltersContext: ExceptionFiltersContext,
    private readonly graphInspector: GraphInspector,
  ) {}

  public registerPatternHandlers(
    instanceWrapper: InstanceWrapper<Controller>,
    serverInstance: Server,
    moduleKey: string,
  ) {
    const { instance } = instanceWrapper;

    const isStatic = instanceWrapper.isDependencyTreeStatic();
    const patternHandlers = this.metadataExplorer.explore(instance);
    const moduleRef = this.container.getModuleByKey(moduleKey);
    const defaultCallMetadata =
      serverInstance instanceof ServerGrpc
        ? DEFAULT_GRPC_CALLBACK_METADATA
        : DEFAULT_CALLBACK_METADATA;

    patternHandlers
      .filter(
        ({ transport }) =>
          isUndefined(transport) ||
          isUndefined(serverInstance.transportId) ||
          transport === serverInstance.transportId,
      )
      .reduce((acc, handler) => {
        handler.patterns.forEach(pattern =>
          acc.push({ ...handler, patterns: [pattern] }),
        );
        return acc;
      }, [] as EventOrMessageListenerDefinition[])
      .forEach((definition: EventOrMessageListenerDefinition) => {
        const {
          patterns: [pattern],
          targetCallback,
          methodKey,
          extras,
          isEventHandler,
        } = definition;

        this.insertEntrypointDefinition(
          instanceWrapper,
          definition,
          serverInstance.transportId!,
        );

        if (isStatic) {
          const proxy = this.contextCreator.create(
            instance,
            targetCallback,
            moduleKey,
            methodKey,
            STATIC_CONTEXT,
            instanceWrapper.id,
            defaultCallMetadata,
          );
          if (isEventHandler) {
            const eventHandler: MessageHandler = async (...args: unknown[]) => {
              const originalArgs = args;
              const [dataOrContextHost] = originalArgs;
              if (dataOrContextHost instanceof RequestContextHost) {
                args = args.slice(1, args.length);
              }
              const returnValue = proxy(...args);
              return this.forkJoinHandlersIfAttached(
                returnValue,
                originalArgs,
                eventHandler,
              );
            };
            return serverInstance.addHandler(
              pattern,
              eventHandler,
              isEventHandler,
              extras,
            );
          } else {
            return serverInstance.addHandler(
              pattern,
              proxy,
              isEventHandler,
              extras,
            );
          }
        }
        const asyncHandler = this.createRequestScopedHandler(
          instanceWrapper,
          pattern,
          moduleRef!,
          moduleKey,
          methodKey,
          defaultCallMetadata,
          isEventHandler,
        );
        serverInstance.addHandler(
          pattern,
          asyncHandler,
          isEventHandler,
          extras,
        );
      });
  }

  public insertEntrypointDefinition(
    instanceWrapper: InstanceWrapper,
    definition: EventOrMessageListenerDefinition,
    transportId: Transport | symbol,
  ) {
    this.graphInspector.insertEntrypointDefinition<MicroserviceEntrypointMetadata>(
      {
        type: 'microservice',
        methodName: definition.methodKey,
        className: instanceWrapper.metatype?.name as string,
        classNodeId: instanceWrapper.id,
        metadata: {
          key: definition.patterns.toString(),
          transportId:
            typeof transportId === 'number'
              ? (Transport[transportId] as keyof typeof Transport)
              : transportId,
          patterns: definition.patterns,
          isEventHandler: definition.isEventHandler,
          extras: definition.extras,
        },
      },
      instanceWrapper.id,
    );
  }

  public forkJoinHandlersIfAttached(
    currentReturnValue: Promise<unknown> | Observable<unknown>,
    originalArgs: unknown[],
    handlerRef: MessageHandler,
  ) {
    if (handlerRef.next) {
      const returnedValueWrapper = handlerRef.next(
        ...(originalArgs as Parameters<MessageHandler>),
      );
      // `forkJoin` unsubscribes the other sources as soon as one completes
      // empty or errors, which would cancel the sibling handlers. Each handler
      // settles on its own instead, and an error fails the join only once
      // every handler has finished.
      return forkJoin({
        current: this.settleHandlerResult(currentReturnValue),
        next: this.settleHandlerResult(returnedValueWrapper),
      }).pipe(
        map(({ current, next }) => {
          if (current.hasFailed) {
            throw current.error;
          }
          if (next.hasFailed) {
            throw next.error;
          }
          return { current: current.value, next: next.value };
        }),
      );
    }
    return currentReturnValue;
  }

  private settleHandlerResult(
    resultOrDeferred: Promise<unknown> | Observable<unknown>,
  ): Observable<SettledHandlerResult> {
    if (resultOrDeferred instanceof Promise) {
      // The handler is running already, but the join only observes its
      // promise once a transport subscribes to it, which it may never do
      // (ServerTCP does not for a peer that is gone). The promise rejects with
      // what an exception filter threw, which no filter has handled.
      resultOrDeferred = resultOrDeferred.catch(handleExceptionFilterFailure);
    }
    return this.transformToObservable(resultOrDeferred).pipe(
      defaultIfEmpty(undefined),
      map((value): SettledHandlerResult => ({ hasFailed: false, value })),
      catchError(error => of<SettledHandlerResult>({ hasFailed: true, error })),
    );
  }

  public assignClientsToProperties(instance: Controller) {
    for (const {
      property,
      metadata,
    } of this.metadataExplorer.scanForClientHooks(instance)) {
      const client = this.clientFactory.create(metadata);
      this.clientsContainer.addClient(client);

      this.assignClientToInstance(instance, property, client);
    }
  }

  public assignClientToInstance<T = any>(
    instance: Controller,
    property: string,
    client: T,
  ) {
    Reflect.set(instance, property, client);
  }

  public createRequestScopedHandler(
    wrapper: InstanceWrapper,
    pattern: PatternMetadata,
    moduleRef: Module,
    moduleKey: string,
    methodKey: string,
    defaultCallMetadata: Record<string, any> = DEFAULT_CALLBACK_METADATA,
    isEventHandler = false,
  ) {
    const collection = moduleRef.controllers;
    const { instance } = wrapper;

    const isTreeDurable = wrapper.isDependencyTreeDurable();

    const requestScopedHandler: MessageHandler = async (...args: unknown[]) => {
      let contextId: ContextId | undefined;
      try {
        let [dataOrContextHost] = args;
        if (dataOrContextHost instanceof RequestContextHost) {
          contextId = this.getContextId(dataOrContextHost, isTreeDurable);
          args.shift();
        } else {
          const [data, reqCtx] = args;
          const request = RequestContextHost.create(
            pattern,
            data,
            reqCtx as BaseRpcContext,
          );
          contextId = this.getContextId(request, isTreeDurable);
          dataOrContextHost = request;
        }

        const contextInstance = await this.injector.loadPerContext(
          instance,
          moduleRef,
          collection,
          contextId,
        );
        const proxy = this.contextCreator.create(
          contextInstance,
          contextInstance[methodKey],
          moduleKey,
          methodKey,
          contextId,
          wrapper.id,
          defaultCallMetadata,
        );

        const returnValue = proxy(...args);
        if (isEventHandler) {
          return this.forkJoinHandlersIfAttached(
            returnValue,
            [dataOrContextHost, ...args],
            requestScopedHandler,
          );
        }
        return returnValue;
      } catch (err) {
        const scopedExceptionFilter =
          contextId &&
          (await this.createScopedExceptionFilter(
            wrapper,
            moduleKey,
            methodKey,
            contextId,
          ));
        let exceptionFilter = this.exceptionFiltersCache.get(
          instance[methodKey],
        );
        if (!exceptionFilter) {
          exceptionFilter = this.exceptionFiltersContext.create(
            instance,
            instance[methodKey],
            moduleKey,
          );
          this.exceptionFiltersCache.set(instance[methodKey], exceptionFilter);
        }
        const host = new ExecutionContextHost(args);
        host.setType('rpc');
        return (scopedExceptionFilter || exceptionFilter).handle(err, host);
      }
    };
    return requestScopedHandler;
  }

  /**
   * Creates the exception filters of a controller that failed to resolve for
   * a context. Request-scoped and transient filters, the global ones
   * included, only exist per context, where they are created after the
   * controller, so the filters for the static context leave them out. Only
   * the filters are created here, so that a guard or an interceptor that
   * depends on what failed does not get in the way. When one of them fails
   * to resolve as well, the filters for the static context are left to
   * handle the error.
   */
  private async createScopedExceptionFilter(
    wrapper: InstanceWrapper,
    moduleKey: string,
    methodKey: string,
    contextId: ContextId,
  ): Promise<RpcExceptionsHandler | undefined> {
    const filters = (wrapper.getEnhancersMetadata() ?? []).filter(
      enhancer => enhancer.subtype === 'filter',
    );
    try {
      // Loaded one by one, as "loadEnhancersPerContext" of the supported
      // "@nestjs/core" versions loads every enhancer of the controller
      if (contextId !== STATIC_CONTEXT) {
        await Promise.all(
          filters.map(filter =>
            this.injector.loadInjectable(
              filter,
              filter.host!,
              contextId,
              wrapper,
            ),
          ),
        );
      }
      return this.exceptionFiltersContext.create(
        wrapper.instance,
        wrapper.instance[methodKey],
        moduleKey,
        contextId,
        wrapper.id,
      );
    } catch {
      return undefined;
    }
  }

  private getContextId<T extends RequestContext = any>(
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

  public transformToObservable<T>(
    resultOrDeferred: Observable<T> | Promise<T>,
  ): Observable<T>;
  public transformToObservable<T>(
    resultOrDeferred: T,
  ): never extends Observable<ObservedValueOf<T>>
    ? Observable<T>
    : Observable<ObservedValueOf<T>>;
  public transformToObservable(resultOrDeferred: any) {
    if (resultOrDeferred instanceof Promise) {
      return fromPromise(resultOrDeferred).pipe(
        mergeMap(val => (isObservable(val) ? val : of(val))),
      );
    }

    if (isObservable(resultOrDeferred)) {
      return resultOrDeferred;
    }

    return of(resultOrDeferred);
  }
}
