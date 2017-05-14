import 'reflect-metadata';
import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { ListenerMetadataExplorer } from './listener-metadata-explorer';
import { Server } from './server/server';
import { ClientProxyFactory } from './client/client-proxy-factory';
import { MetadataScanner } from '@nestjs/core/metadata-scanner';

export class ListenersController {
    private readonly metadataExplorer = new ListenerMetadataExplorer(new MetadataScanner());

    public bindPatternHandlers(instance: Controller, server: Server) {
        const patternHandlers = this.metadataExplorer.explore(instance);
        patternHandlers.forEach(({ pattern, targetCallback }) => server.add(pattern, targetCallback));
    }

    public bindClientsToProperties(instance: Controller) {
        for (const { property, metadata } of this.metadataExplorer.scanForClientHooks(instance)) {
            Reflect.set(instance, property, ClientProxyFactory.create(metadata));
        }
    }
}
