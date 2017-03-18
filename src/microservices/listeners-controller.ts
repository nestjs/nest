import 'reflect-metadata';
import { Controller } from '../common/interfaces/controller.interface';
import { ListenerMetadataExplorer } from './listener-metadata-explorer';
import { Server } from './server/server';
import { ClientProxyFactory } from './client/client-proxy-factory';

export class ListenersController {
    private readonly metadataExplorer = new ListenerMetadataExplorer();

    bindPatternHandlers(instance: Controller, server: Server) {
        const patternHandlers = this.metadataExplorer.explore(instance);

        patternHandlers.forEach(({ pattern, targetCallback }) => {
            server.add(pattern, targetCallback);
        });
    }

    bindClientsToProperties(instance: Controller) {
        for (const { property, metadata } of this.metadataExplorer.scanForClientHooks(instance)) {
            Reflect.set(instance, property, ClientProxyFactory.create(metadata));
        }
    }

}
