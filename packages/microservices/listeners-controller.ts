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
import { MetadataScanner } from '@nestjs/core/metadata-scanner';
import { REQUEST_CONTEXT_ID } from '@nestjs/core/router/request/request-constants';
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
import {
  CustomTransportStrategy,
  MessageHandler,
  PatternMetadata,
  RequestContext,
} from './interfaces';
import { ListenerMetadataExplorer } from './listener-metadata-explorer';
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
      .forEach(({ pattern, targetCallback, methodKey, isEventHandler }) => {
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
            const eventHandler: MessageHandler = (...args: unknown[]) => {
              const originalArgs = args;
              const [dataOrContextHost] = originalArgs;
              if (dataOrContextHost instanceof RequestContextHost) {
                args = args.slice(1, args.length);
              }
              const originalReturnValue = proxy(...args);
              eventHandler.next?.(
                ...(originalArgs as Parameters<MessageHandler>),
              );
              return originalReturnValue;
            };
            return server.addHandler(pattern, eventHandler, isEventHandler);
          } else {
            return server.addHandler(pattern, proxy, isEventHandler);
          }
        }
        const asyncHandler = this.createRequestScopedHandler(
          instanceWrapper,
          pattern,
          moduleRef,
          moduleKey,
          methodKey,
          defaultCallMetadata,
        );
        server.addHandler(pattern, asyncHandler, isEventHandler);
      });
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
  ) {
    const collection = moduleRef.controllers;
    const { instance } = wrapper;

    const requestScopedHandler: MessageHandler = async (...args: unknown[]) => {
      try {
        let contextId: ContextId;

        let [dataOrContextHost] = args;
        if (dataOrContextHost instanceof RequestContextHost) {
          contextId = this.getContextId(dataOrContextHost);
          args.shift();
        } else {
          const [data, reqCtx] = args;
          const request = RequestContextHost.create(
            pattern,
            data,
            reqCtx as BaseRpcContext,
          );
          contextId = this.getContextId(request);
          this.container.registerRequestProvider(request, contextId);
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
        requestScopedHandler.next?.(dataOrContextHost, ...args);
        return proxy(...args);
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

  private getContextId<T extends RequestContext = any>(request: T): ContextId {
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
