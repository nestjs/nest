import {validatePath} from '@nestjs/common/utils/shared.utils';
import {ApplicationConfig} from '@nestjs/core/application-config';

import {SocketsContainer} from './container';
import {
  ObservableSocketServer
} from './interfaces/observable-socket-server.interface';
import {ObservableSocket} from './observable-socket';

export class SocketServerProvider {
  constructor(private readonly socketsContainer: SocketsContainer,
              private readonly applicationConfig: ApplicationConfig) {}

  public scanForSocketServer(namespace: string,
                             port: number): ObservableSocketServer {
    const observableServer = this.socketsContainer.getServer(namespace, port);
    return observableServer ? observableServer
                            : this.createSocketServer(namespace, port);
  }

  private createSocketServer(namespace: string, port: number) {
    const server = this.getServerOfNamespace(namespace, port);
    const observableSocket = ObservableSocket.create(server);

    this.socketsContainer.addServer(namespace, port, observableSocket);
    return observableSocket;
  }

  private getServerOfNamespace(namespace: string, port: number) {
    const adapter = this.applicationConfig.getIoAdapter();
    if (namespace && adapter.createWithNamespace) {
      return adapter.createWithNamespace(port,
                                         this.validateNamespace(namespace));
    }
    return adapter.create(port);
  }

  private validateNamespace(namespace: string): string {
    return validatePath(namespace);
  }
}