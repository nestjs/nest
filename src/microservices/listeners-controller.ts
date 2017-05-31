import 'reflect-metadata';
import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { ListenerMetadataExplorer } from './listener-metadata-explorer';
import { Server } from './server/server';
import { ClientProxyFactory } from './client/client-proxy-factory';
import { MetadataScanner } from '@nestjs/core/metadata-scanner';
import { CustomTransportStrategy } from './interfaces';
import { ClientsContainer } from './container';

export class ListenersController {
    private readonly metadataExplorer = new ListenerMetadataExplorer(new MetadataScanner());

    constructor(private readonly clientsContainer: ClientsContainer) {}

    public bindPatternHandlers(instance: Controller, server: Server & CustomTransportStrategy) {
        const patternHandlers = this.metadataExplorer.explore(instance);
        patternHandlers.forEach(({ pattern, targetCallback }) => server.add(pattern, targetCallback));
    }

    public bindClientsToProperties(instance: Controller) {
        for (const { property, metadata } of this.metadataExplorer.scanForClientHooks(instance)) {
            const client = ClientProxyFactory.create(metadata);

            this.clientsContainer.addClient(client);
            Reflect.set(instance, property, client);
        }
    }
}
