import 'reflect-metadata';
import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { ListenerMetadataExplorer } from './listener-metadata-explorer';
import { Server } from './server/server';
import { ClientProxyFactory } from './client/client-proxy-factory';
import { MetadataScanner } from '@nestjs/core/metadata-scanner';
import { CustomTransportStrategy } from './interfaces';
import { ClientsContainer } from './container';
import { RpcContextCreator } from './context/rpc-context-creator';

export class ListenersController {
  private readonly metadataExplorer = new ListenerMetadataExplorer(
    new MetadataScanner(),
  );

  constructor(
    private readonly clientsContainer: ClientsContainer,
    private readonly contextCreator: RpcContextCreator,
  ) {}

  public bindPatternHandlers(
    instance: Controller,
    server: Server & CustomTransportStrategy,
    module: string,
  ) {
    const patternHandlers = this.metadataExplorer.explore(instance);
    patternHandlers.forEach(({ pattern, targetCallback }) => {
      const proxy = this.contextCreator.create(
        instance,
        targetCallback,
        module,
      );
      server.addHandler(pattern, proxy);
    });
  }

  public bindClientsToProperties(instance: Controller) {
    for (const {
      property,
      metadata,
    } of this.metadataExplorer.scanForClientHooks(instance)) {
      const client = ClientProxyFactory.create(metadata);

      this.clientsContainer.addClient(client);
      Reflect.set(instance, property, client);
    }
  }
}
