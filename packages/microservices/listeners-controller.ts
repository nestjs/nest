import { Injectable } from '@nestjs/common/interfaces';
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
  forkJoin,
  from as fromPromise,
  isObservable,
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
import {
  DEFAULT_CALLBACK_METADATA,
  DEFAULT_GRPC_CALLBACK_METADATA,
} from './context/rpc-metadata-constants';
import { BaseRpcContext } from './ctx-host/base-rpc.context';
import { Transport } from './enums';
import {
  CustomTransportStrategy,
  MessageHandler,
  PatternMetadata,
  RequestContext,
} from './interfaces';
import { MicroserviceEntrypointMetadata } from './interfaces/microservice-entrypoint-metadata.interface';
import {
  EventOrMessageListenerDefinition,
  ListenerMetadataExplorer,
} from './listener-metadata-explorer';
import { ServerGrpc } from './server';
import { Server } from './server/server';

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
    instanceWrapper: InstanceWrapper<Controller | Injectable>,
    server: Server & CustomTransportStrategy,
    moduleKey: string,
  ) {
    const { instance } = instanceWrapper;

    const isStatic = instanceWrapper.isDependencyTreeStatic();
    const patternHandlers = this.metadataExplorer.explore(instance as object);
    const moduleRef = this.container.getModuleByKey(moduleKey);
    const defaultCallMetadata =
      server instanceof ServerGrpc
        ? DEFAULT_GRPC_CALLBACK_METADATA
        : DEFAULT_CALLBACK_METADATA;

    patternHandlers
      .filter(
        ({ transport }) =>
          isUndefined(transport) ||
          isUndefined(server.transportId) ||
          transport === server.transportId,
      )
      .reduce((acc, handler) => {
        handler.patterns.forEach(pattern =>
          acc.push({ ...handler, patterns: [pattern] }),
        );
        return acc;
      }, [])
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
          server.transportId,
        );

        if (isStatic) {
          const proxy = this.contextCreator.create(
            instance as object,
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
            return server.addHandler(
              pattern,
              eventHandler,
              isEventHandler,
              extras,
            );
          } else {
            return server.addHandler(pattern, proxy, isEventHandler, extras);
          }
        }
        const asyncHandler = this.createRequestScopedHandler(
          instanceWrapper,
          pattern,
          moduleRef,
          moduleKey,
          methodKey,
          defaultCallMetadata,
          isEventHandler,
        );
        server.addHandler(pattern, asyncHandler, isEventHandler, extras);
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
        className: instanceWrapper.metatype?.name,
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

  public assignClientsToProperties(instance: Controller | Injectable) {
    for (const {
      property,
      metadata,
    } of this.metadataExplorer.scanForClientHooks(instance as object)) {
      const client = this.clientFactory.create(metadata);
      this.clientsContainer.addClient(client);

      this.assignClientToInstance(instance as object, property, client);
    }
  }

  public assignClientToInstance<T = any>(
    instance: Controller | Injectable,
    property: string,
    client: T,
  ) {
    Reflect.set(instance as object, property, client);
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

      const requestProviderValue = isTreeDurable ? contextId.payload : request;
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
