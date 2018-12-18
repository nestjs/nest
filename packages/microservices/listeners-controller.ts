import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { NestContainer } from '@nestjs/core/injector/container';
import { Injector } from '@nestjs/core/injector/injector';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { MetadataScanner } from '@nestjs/core/metadata-scanner';
import { IClientProxyFactory } from './client/client-proxy-factory';
import { ClientsContainer } from './container';
import { RpcContextCreator } from './context/rpc-context-creator';
import { CustomTransportStrategy } from './interfaces';
import { ListenerMetadataExplorer } from './listener-metadata-explorer';
import { Server } from './server/server';

export class ListenersController {
  private readonly metadataExplorer = new ListenerMetadataExplorer(
    new MetadataScanner(),
  );

  constructor(
    private readonly clientsContainer: ClientsContainer,
    private readonly contextCreator: RpcContextCreator,
    private readonly container: NestContainer,
    private readonly injector: Injector,
    private readonly clientFactory: IClientProxyFactory,
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
    const collection = module.controllers;

    patternHandlers.forEach(({ pattern, targetCallback, methodKey }) => {
      if (isStatic) {
        const proxy = this.contextCreator.create(
          instance,
          targetCallback,
          moduleKey,
        );
        return server.addHandler(pattern, proxy);
      }
      server.addHandler(pattern, data => {
        const contextId = { id: 1 }; // async id
        const contextInstance = this.injector.loadPerContext(
          instance,
          module,
          collection,
          contextId,
        );
        const proxy = this.contextCreator.create(
          contextInstance,
          contextInstance[methodKey],
          moduleKey,
        );
        return proxy(data);
      });
    });
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
}
