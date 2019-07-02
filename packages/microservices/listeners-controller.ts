import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { createContextId } from '@nestjs/core/helpers/context-id-factory';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { NestContainer } from '@nestjs/core/injector/container';
import { Injector } from '@nestjs/core/injector/injector';
import {
  ContextId,
  InstanceWrapper,
} from '@nestjs/core/injector/instance-wrapper';
import { Module } from '@nestjs/core/injector/module';
import { MetadataScanner } from '@nestjs/core/metadata-scanner';
import { REQUEST } from '@nestjs/core/router/request/request-constants';
import { IClientProxyFactory } from './client/client-proxy-factory';
import { ClientsContainer } from './container';
import { ExceptionFiltersContext } from './context/exception-filters-context';
import { RpcContextCreator } from './context/rpc-context-creator';
import {
  CustomTransportStrategy,
  PatternMetadata,
  RequestContext,
} from './interfaces';
import { ListenerMetadataExplorer } from './listener-metadata-explorer';
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

  public bindPatternHandlers(
    instanceWrapper: InstanceWrapper<Controller>,
    server: Server & CustomTransportStrategy,
    moduleKey: string,
  ) {
    const { instance } = instanceWrapper;

    const isStatic = instanceWrapper.isDependencyTreeStatic();
    const patternHandlers = this.metadataExplorer.explore(instance);
    const module = this.container.getModuleByKey(moduleKey);

    patternHandlers.forEach(
      ({ pattern, targetCallback, methodKey, isEventHandler }) => {
        if (isStatic) {
          const proxy = this.contextCreator.create(
            instance,
            targetCallback,
            moduleKey,
          );
          return server.addHandler(pattern, proxy, isEventHandler);
        }
        const asyncHandler = this.createRequestScopedHandler(
          instanceWrapper,
          pattern,
          module,
          moduleKey,
          methodKey,
        );
        server.addHandler(pattern, asyncHandler, isEventHandler);
      },
    );
  }

  public bindClientsToProperties(instance: Controller) {
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
    module: Module,
    moduleKey: string,
    methodKey: string,
  ) {
    const collection = module.controllers;
    const { instance } = wrapper;
    return async (...args: unknown[]) => {
      try {
        const data = args[0];
        const contextId = createContextId();
        this.registerRequestProvider({ pattern, data }, contextId);

        const contextInstance = await this.injector.loadPerContext(
          instance,
          module,
          collection,
          contextId,
        );
        const proxy = this.contextCreator.create(
          contextInstance,
          contextInstance[methodKey],
          moduleKey,
          contextId,
          wrapper.id,
        );
        return proxy(data);
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
        exceptionFilter.handle(err, host);
      }
    };
  }

  private registerRequestProvider(
    request: RequestContext,
    contextId: ContextId,
  ) {
    const coreModuleRef = this.container.getInternalCoreModuleRef();
    const wrapper = coreModuleRef.getProviderByKey(REQUEST);

    wrapper.setInstanceByContextId(contextId, {
      instance: request,
      isResolved: true,
    });
  }
}
