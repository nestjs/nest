import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { InstanceWrapper } from '@nestjs/core/injector/container';
import { CustomTransportStrategy } from './interfaces';
import { Server } from './server/server';
export declare class MicroservicesModule {
    private readonly clientsContainer;
    private listenersController;
    register(container: any, config: any): void;
    setupListeners(container: any, server: Server & CustomTransportStrategy): void;
    setupClients(container: any): void;
    bindListeners(controllers: Map<string, InstanceWrapper<Controller>>, server: Server & CustomTransportStrategy, module: string): void;
    bindClients(items: Map<string, InstanceWrapper<Controller>>): void;
    close(): void;
}
