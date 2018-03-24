import 'reflect-metadata';
import { Controller } from '@nestjs/common/interfaces/controllers/controller.interface';
import { Server } from './server/server';
import { CustomTransportStrategy } from './interfaces';
import { ClientsContainer } from './container';
import { RpcContextCreator } from './context/rpc-context-creator';
export declare class ListenersController {
  private readonly clientsContainer;
  private readonly contextCreator;
  private readonly metadataExplorer;
  constructor(
    clientsContainer: ClientsContainer,
    contextCreator: RpcContextCreator,
  );
  bindPatternHandlers(
    instance: Controller,
    server: Server & CustomTransportStrategy,
    module: string,
  ): void;
  bindClientsToProperties(instance: Controller): void;
}
