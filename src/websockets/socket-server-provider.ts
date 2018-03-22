import { SocketsContainer } from './container';
import { ObservableSocket } from './observable-socket';
import { ObservableSocketServer } from './interfaces/observable-socket-server.interface';
import { validatePath } from '@nestjs/common/utils/shared.utils';
import { ApplicationConfig } from '@nestjs/core/application-config';

export class SocketServerProvider {
  constructor(
    private readonly socketsContainer: SocketsContainer,
    private readonly applicationConfig: ApplicationConfig,
  ) {}

  public scanForSocketServer(
    options: any,
    port: number,
  ): ObservableSocketServer {
    const observableServer = this.socketsContainer.getServerByPort(port);
    return observableServer
      ? this.createWithNamespace(options, port, observableServer)
      : this.createSocketServer(options, port);
  }

  private createSocketServer(
    options: any,
    port: number,
  ): ObservableSocketServer {
    const { namespace, server, ...opt } = options;
    const adapter = this.applicationConfig.getIoAdapter();
    const ioServer = adapter.create(port, opt);
    const observableSocket = ObservableSocket.create(ioServer);

    this.socketsContainer.addServer(null, port, observableSocket);
    return this.createWithNamespace(options, port, observableSocket);
  }

  private createWithNamespace(
    options: any,
    port: number,
    observableSocket: ObservableSocketServer,
  ): ObservableSocketServer {
    const { namespace } = options;
    if (!namespace) {
      return observableSocket;
    }
    const namespaceServer = this.getServerOfNamespace(
      options,
      port,
      observableSocket.server,
    );
    const observableNamespaceSocket = ObservableSocket.create(namespaceServer);
    this.socketsContainer.addServer(namespace, port, observableNamespaceSocket);
    return observableNamespaceSocket;
  }

  private getServerOfNamespace(options: any, port: number, server) {
    const adapter = this.applicationConfig.getIoAdapter();
    return adapter.create(port, {
      ...options,
      namespace: this.validateNamespace(options.namespace || ''),
      server,
    });
  }

  private validateNamespace(namespace: string): string {
    return validatePath(namespace);
  }
}
