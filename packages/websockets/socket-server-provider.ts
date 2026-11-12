import { Logger } from '@nestjs/common';
import {
  addLeadingSlash,
  isNil,
  isString,
} from '@nestjs/common/utils/shared.utils';
import { ApplicationConfig } from '@nestjs/core/application-config';
import { isDeepStrictEqual } from 'util';
import { ServerAndEventStreamsFactory } from './factories/server-and-event-streams-factory';
import { GatewayMetadata } from './interfaces/gateway-metadata.interface';
import { ServerAndEventStreamsHost } from './interfaces/server-and-event-streams-host.interface';
import { SocketsContainer } from './sockets-container';

// The options that decide whether a client may connect at all. They are
// options of the server, which gateways on the same port and path share.
const CONNECTION_CHECKS = ['verifyClient', 'allowRequest'];
// The options of a gateway that are not options of its server
const GATEWAY_KEYS = ['namespace', 'path', 'server'];

export class SocketServerProvider {
  private readonly logger = new Logger(SocketServerProvider.name);
  // The options of the gateway each server was created for
  private readonly serverOptions = new WeakMap<
    ServerAndEventStreamsHost,
    Record<string, unknown>
  >();

  constructor(
    private readonly socketsContainer: SocketsContainer,
    private readonly applicationConfig: ApplicationConfig,
  ) {}

  public scanForSocketServer<T extends GatewayMetadata = any>(
    options: T,
    port: number,
    gatewayName?: string,
  ): ServerAndEventStreamsHost {
    const serverAndStreamsHost = this.socketsContainer.getOneByConfig({
      port,
      path: options.path,
    });
    if (serverAndStreamsHost) {
      this.ensureOptionsApply(options, port, serverAndStreamsHost, gatewayName);
    }
    if (serverAndStreamsHost && options.namespace) {
      return this.decorateWithNamespace(
        options,
        port,
        serverAndStreamsHost.server,
      );
    }
    return serverAndStreamsHost
      ? serverAndStreamsHost
      : this.createSocketServer(options, port);
  }

  private createSocketServer<T extends GatewayMetadata>(
    options: T,
    port: number,
  ): ServerAndEventStreamsHost {
    const adapter = this.applicationConfig.getIoAdapter();
    const { namespace, server, ...partialOptions } = options as Record<
      string,
      unknown
    >;
    const ioServer = adapter.create(port, partialOptions);
    const serverAndEventStreamsHost =
      ServerAndEventStreamsFactory.create(ioServer);

    this.socketsContainer.addOne(
      { port, path: options.path },
      serverAndEventStreamsHost,
    );
    this.serverOptions.set(
      serverAndEventStreamsHost,
      options as Record<string, unknown>,
    );
    if (!namespace) {
      return serverAndEventStreamsHost;
    }
    return this.decorateWithNamespace(options, port, ioServer);
  }

  /**
   * A gateway that joins a server created for another gateway is served with
   * the options of that gateway. A connection check of its own would never
   * run, and every client would reach its handlers, so the application does
   * not start. Other options it would lose are reported.
   */
  private ensureOptionsApply(
    options: Record<string, any>,
    port: number,
    host: ServerAndEventStreamsHost,
    gatewayName?: string,
  ) {
    const serverOptions = this.serverOptions.get(host);
    if (!serverOptions) {
      return;
    }
    const gateway = gatewayName ? `The gateway ${gatewayName}` : 'A gateway';
    const server = `the server on port ${port}${options.path ? ` and the path "${options.path}"` : ''}`;
    for (const key of CONNECTION_CHECKS) {
      if (!isNil(options[key]) && options[key] !== serverOptions[key]) {
        const error = new Error(
          `${gateway} sets "${key}", but shares ${server} with a gateway declared before it, and the server runs ${isNil(serverOptions[key]) ? 'no' : 'the'} "${key}" of that gateway. Set the same "${key}" on the gateway declared first, or give the gateway a port or path of its own.`,
        );
        this.logger.error(error);
        throw error;
      }
    }
    const droppedOptions = Object.keys(options).filter(
      key =>
        !GATEWAY_KEYS.includes(key) &&
        !CONNECTION_CHECKS.includes(key) &&
        !isDeepStrictEqual(options[key], serverOptions[key]),
    );
    if (droppedOptions.length > 0) {
      this.logger.warn(
        `${gateway} shares ${server} with a gateway declared before it, and the server was created with the options of that gateway, so these options of its own are not applied: ${droppedOptions.map(key => `"${key}"`).join(', ')}.`,
      );
    }
  }

  private decorateWithNamespace<T extends GatewayMetadata = any>(
    options: T,
    port: number,
    targetServer: unknown,
  ): ServerAndEventStreamsHost {
    // Gateways on the same namespace share one host, and with it the streams
    // of connections and disconnections, as gateways sharing a server do.
    // socket.io also serves a RegExp namespace from the first parent namespace
    // created for it, so a second one would never get a connection.
    const namespaceConfig = {
      port,
      path: options.path,
      namespace: this.validateNamespace(options.namespace || ''),
    };
    const namespaceHost = this.socketsContainer.getOneByConfig(namespaceConfig);
    if (namespaceHost) {
      return namespaceHost;
    }
    const namespaceServer = this.getServerOfNamespace(
      options,
      port,
      targetServer,
    );
    const serverAndEventStreamsHost =
      ServerAndEventStreamsFactory.create(namespaceServer);
    // "/" is the namespace of the gateways without one, so a gateway on it
    // shares their streams too, while it keeps the namespace as its server
    const rootHost =
      namespaceConfig.namespace === '/'
        ? this.socketsContainer.getOneByConfig({ port, path: options.path })
        : undefined;
    if (rootHost) {
      serverAndEventStreamsHost.connection = rootHost.connection;
      serverAndEventStreamsHost.disconnect = rootHost.disconnect;
    }
    this.socketsContainer.addOne(namespaceConfig, serverAndEventStreamsHost);
    return serverAndEventStreamsHost;
  }

  private getServerOfNamespace<
    TOptions extends GatewayMetadata = any,
    TServer = any,
  >(options: TOptions, port: number, server: TServer) {
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
