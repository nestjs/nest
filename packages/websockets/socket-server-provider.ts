import { addLeadingSlash } from '@nestjs/common/utils/shared.utils';
import { ApplicationConfig } from '@nestjs/core/application-config';
import { isString } from 'util';

import { GatewayMetadata } from './interfaces/gateway-metadata.interface';
import { SocketEventsHost } from './interfaces/socket-events-host.interface';
import { SocketEventsHostFactory } from './socket-events-host-factory';
import { SocketsContainer } from './sockets-container';

export class SocketServerProvider {
  constructor(
    private readonly socketsContainer: SocketsContainer,
    private readonly applicationConfig: ApplicationConfig,
  ) {}

  public scanForSocketServer<T extends GatewayMetadata>(
    options: T,
    port: number,
  ): SocketEventsHost {
    const socketEventsHost = this.socketsContainer.getSocketEventsHostByPort(
      port,
    );
    return socketEventsHost
      ? this.createWithNamespace(options, port, socketEventsHost)
      : this.createSocketServer(options, port);
  }

  private createSocketServer<T extends GatewayMetadata>(
    options: T,
    port: number,
  ): SocketEventsHost {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { namespace, server, ...partialOptions } = options as any;
    const adapter = this.applicationConfig.getIoAdapter();
    const ioServer = adapter.create(port, partialOptions);
    const observableSocket = SocketEventsHostFactory.create(ioServer);

    this.socketsContainer.addSocketEventsHost(null, port, observableSocket);
    return this.createWithNamespace(options, port, observableSocket);
  }

  private createWithNamespace<T extends GatewayMetadata>(
    options: T,
    port: number,
    socketEventsHost: SocketEventsHost,
  ): SocketEventsHost {
    const { namespace } = options;
    if (!namespace) {
      return socketEventsHost;
    }
    const namespaceServer = this.getServerOfNamespace(
      options,
      port,
      socketEventsHost.server,
    );
    const eventsHost = SocketEventsHostFactory.create(namespaceServer);
    this.socketsContainer.addSocketEventsHost(namespace, port, eventsHost);
    return eventsHost;
  }

  private getServerOfNamespace<TOptions extends GatewayMetadata, TServer = any>(
    options: TOptions,
    port: number,
    server: TServer,
  ) {
    const adapter = this.applicationConfig.getIoAdapter();
    return adapter.create(port, {
      ...options,
      namespace: this.validateNamespace(options.namespace || ''),
      server,
    });
  }

  private validateNamespace(namespace: string | RegExp): string | RegExp {
    if (!isString(namespace)) {
      return namespace;
    }
    return addLeadingSlash(namespace);
  }
}
