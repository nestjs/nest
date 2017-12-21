import { SocketsContainer } from './container';
import { ObservableSocketServer } from './interfaces/observable-socket-server.interface';
import { ApplicationConfig } from '@nestjs/core/application-config';
export declare class SocketServerProvider {
  private readonly socketsContainer;
  private readonly applicationConfig;
  constructor(
    socketsContainer: SocketsContainer,
    applicationConfig: ApplicationConfig
  );
  scanForSocketServer(namespace: string, port: number): ObservableSocketServer;
  private createSocketServer(namespace, port);
  private createWithNamespace(namespace, port, observableSocket);
  private getServerOfNamespace(namespace, port, server);
  private validateNamespace(namespace);
}
