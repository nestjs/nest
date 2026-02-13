import {
  forkJoin,
  from as fromPromise,
  isObservable,
  mergeMap,
  Observable,
  ObservedValueOf,
  of,
} from 'rxjs';
import { IClientProxyFactory } from './client/client-proxy-factory.js';
import { ClientsContainer } from './container.js';
import { ExceptionFiltersContext } from './context/exception-filters-context.js';
import { RequestContextHost } from './context/request-context-host.js';
import { RpcContextCreator } from './context/rpc-context-creator.js';
import {
  DEFAULT_CALLBACK_METADATA,
  DEFAULT_GRPC_CALLBACK_METADATA,
} from './context/rpc-metadata-constants.js';
import { BaseRpcContext } from './ctx-host/base-rpc.context.js';
import { Transport } from './enums/index.js';
import {
  MessageHandler,
  PatternMetadata,
  RequestContext,
} from './interfaces/index.js';
import { MicroserviceEntrypointMetadata } from './interfaces/microservice-entrypoint-metadata.interface.js';
import {
  EventOrMessageListenerDefinition,
  ListenerMetadataExplorer,
} from './listener-metadata-explorer.js';
import { ServerGrpc } from './server/index.js';
import { Server } from './server/server.js';
import { Controller, isUndefined } from '@nestjs/common/internal';
import {
  ContextIdFactory,
  NestContainer,
  ContextId,
  GraphInspector,
  MetadataScanner,
} from '@nestjs/core';
import {
  ExecutionContextHost,
  STATIC_CONTEXT,
  Injector,
  InstanceWrapper,
  Module,
  REQUEST_CONTEXT_ID,
} from '@nestjs/core/internal';

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
      .flatMap(handler =>
        handler.patterns.map(pattern => ({
          ...handler,
          patterns: [pattern],
        })),
      )
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
            undefined,
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
      return forkJoin({
        current: this.transformToObservable(currentReturnValue),
        next: this.transformToObservable(returnedValueWrapper),
      });
    }
    return currentReturnValue;
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
      try {
        let contextId: ContextId;

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
        return exceptionFilter.handle(err, host);
      }
    };
    return requestScopedHandler;
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
