import { SocketsContainer } from './container';
import { ObservableSocket } from './observable-socket';
import { ObservableSocketServer } from './interfaces/observable-socket-server.interface';
import { validatePath } from '@nestjs/common/utils/shared.utils';
import { ApplicationConfig } from '@nestjs/core/application-config';

export class SocketServerProvider {
  constructor(
    private readonly socketsContainer: SocketsContainer,
    private readonly applicationConfig: ApplicationConfig
  ) {}

  public scanForSocketServer(
    namespace: string,
    port: number
  ): ObservableSocketServer {
    const observableServer = this.socketsContainer.getServerByPort(port);
    return observableServer
      ? this.createWithNamespace(namespace, port, observableServer)
      : this.createSocketServer(namespace, port);
  }

  private createSocketServer(
    namespace: string,
    port: number
  ): ObservableSocketServer {
    const adapter = this.applicationConfig.getIoAdapter();
    const server = adapter.create(port);
    const observableSocket = ObservableSocket.create(server);

    this.socketsContainer.addServer(null, port, observableSocket);
    return this.createWithNamespace(namespace, port, observableSocket);
  }

  private createWithNamespace(
    namespace: string,
    port: number,
    observableSocket: ObservableSocketServer
  ): ObservableSocketServer {
    const adapter = this.applicationConfig.getIoAdapter();
    if (!namespace || !adapter.createWithNamespace) {
      return observableSocket;
    }
    const namespaceServer = this.getServerOfNamespace(
      namespace,
      port,
      observableSocket.server
    );
    const observableNamespaceSocket = ObservableSocket.create(namespaceServer);
    this.socketsContainer.addServer(namespace, port, observableNamespaceSocket);

    return observableNamespaceSocket;
  }

  private getServerOfNamespace(namespace: string, port: number, server) {
    const adapter = this.applicationConfig.getIoAdapter();
    return adapter.createWithNamespace(
      port,
      this.validateNamespace(namespace),
      server
    );
  }

  private validateNamespace(namespace: string): string {
    return validatePath(namespace);
  }
}
