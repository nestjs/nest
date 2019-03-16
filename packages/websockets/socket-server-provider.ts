import { validatePath } from '@nestjs/common/utils/shared.utils';
import { ApplicationConfig } from '@nestjs/core/application-config';
import { isString } from 'util';
import { SocketsContainer } from './container';
import { GatewayMetadata } from './interfaces/gateway-metadata.interface';
import { ObservableSocketServer } from './interfaces/observable-socket-server.interface';
import { ObservableSocket } from './observable-socket';

export class SocketServerProvider {
  constructor(
    private readonly socketsContainer: SocketsContainer,
    private readonly applicationConfig: ApplicationConfig,
  ) {}

  public scanForSocketServer<T extends GatewayMetadata>(
    options: T,
    port: number,
  ): ObservableSocketServer {
    const observableServer = this.socketsContainer.getServerByPort(port);
    return observableServer
      ? this.createWithNamespace(options, port, observableServer)
      : this.createSocketServer(options, port);
  }

  private createSocketServer<T extends GatewayMetadata>(
    options: T,
    port: number,
  ): ObservableSocketServer {
    const { namespace, server, ...opt } = options as any;
    const adapter = this.applicationConfig.getIoAdapter();
    const ioServer = adapter.create(port, opt);
    const observableSocket = ObservableSocket.create(ioServer);

    this.socketsContainer.addServer(null, port, observableSocket);
    return this.createWithNamespace(options, port, observableSocket);
  }

  private createWithNamespace<T extends GatewayMetadata>(
    options: T,
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

  private getServerOfNamespace<TOptions extends GatewayMetadata, TServer = any>(
    options: TOptions,
    port: number,
    server: TServer,
  ) {
    const adapter = this.applicationConfig.getIoAdapter();
    return adapter.create(port, {
      ...(options as any),
      namespace: this.validateNamespace(options.namespace || ''),
      server,
    });
  }

  private validateNamespace(namespace: string | RegExp): string | RegExp {
    if (!isString(namespace)) {
      return namespace;
    }
    return validatePath(namespace);
  }
}
