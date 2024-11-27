import { NestApplicationContextOptions } from '@nestjs/common/interfaces/nest-application-context-options.interface';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { Logger } from '@nestjs/common/services/logger.service';
import { ApplicationConfig } from '@nestjs/core/application-config';
import { GraphInspector } from '@nestjs/core/inspector/graph-inspector';
import { MetadataScanner } from '@nestjs/core/metadata-scanner';
import {
  from as fromPromise,
  isObservable,
  Observable,
  of,
  Subject,
} from 'rxjs';
import { distinctUntilChanged, mergeAll } from 'rxjs/operators';
import { GATEWAY_OPTIONS, PORT_METADATA } from './constants';
import { WsContextCreator } from './context/ws-context-creator';
import { InvalidSocketPortException } from './errors/invalid-socket-port.exception';
import {
  GatewayMetadataExplorer,
  MessageMappingProperties,
} from './gateway-metadata-explorer';
import { GatewayMetadata } from './interfaces/gateway-metadata.interface';
import { NestGateway } from './interfaces/nest-gateway.interface';
import { ServerAndEventStreamsHost } from './interfaces/server-and-event-streams-host.interface';
import { WebsocketEntrypointMetadata } from './interfaces/websockets-entrypoint-metadata.interface';
import { SocketServerProvider } from './socket-server-provider';
import { compareElementAt } from './utils/compare-element.util';

export class WebSocketsController {
  private readonly logger = new Logger(WebSocketsController.name, {
    timestamp: true,
  });
  private readonly metadataExplorer = new GatewayMetadataExplorer(
    new MetadataScanner(),
  );

  constructor(
    private readonly socketServerProvider: SocketServerProvider,
    private readonly config: ApplicationConfig,
    private readonly contextCreator: WsContextCreator,
    private readonly graphInspector: GraphInspector,
    private readonly appOptions: NestApplicationContextOptions = {},
  ) {}

  public connectGatewayToServer(
    instance: NestGateway,
    metatype: Type<unknown> | Function,
    moduleKey: string,
    instanceWrapperId: string,
  ) {
    const options = Reflect.getMetadata(GATEWAY_OPTIONS, metatype) || {};
    const port = Reflect.getMetadata(PORT_METADATA, metatype) || 0;

    if (!Number.isInteger(port)) {
      throw new InvalidSocketPortException(port, metatype);
    }
    this.subscribeToServerEvents(
      instance,
      options,
      port,
      moduleKey,
      instanceWrapperId,
    );
  }

  public subscribeToServerEvents<T extends GatewayMetadata>(
    instance: NestGateway,
    options: T,
    port: number,
    moduleKey: string,
    instanceWrapperId: string,
  ) {
    const nativeMessageHandlers = this.metadataExplorer.explore(instance);
    const messageHandlers = nativeMessageHandlers.map(
      ({ callback, message, methodName }) => ({
        message,
        methodName,
        callback: this.contextCreator.create(
          instance,
          callback,
          moduleKey,
          methodName,
        ),
      }),
    );

    this.inspectEntrypointDefinitions(
      instance,
      port,
      messageHandlers,
      instanceWrapperId,
    );

    if (this.appOptions.preview) {
      return;
    }
    const observableServer = this.socketServerProvider.scanForSocketServer<T>(
      options,
      port,
    );
    this.assignServerToProperties(instance, observableServer.server);
    this.subscribeEvents(instance, messageHandlers, observableServer);
  }

  public subscribeEvents(
    instance: NestGateway,
    subscribersMap: MessageMappingProperties[],
    observableServer: ServerAndEventStreamsHost,
  ) {
    const { init, disconnect, connection, server } = observableServer;
    const adapter = this.config.getIoAdapter();

    this.subscribeInitEvent(instance, init);
    this.subscribeConnectionEvent(instance, connection);
    this.subscribeDisconnectEvent(instance, disconnect);

    const handler = this.getConnectionHandler(
      this,
      instance,
      subscribersMap,
      disconnect,
      connection,
    );
    adapter.bindClientConnect(server, handler);
    this.printSubscriptionLogs(instance, subscribersMap);
  }

  public getConnectionHandler(
    context: WebSocketsController,
    instance: NestGateway,
    subscribersMap: MessageMappingProperties[],
    disconnect: Subject<any>,
    connection: Subject<any>,
  ) {
    const adapter = this.config.getIoAdapter();
    return (...args: unknown[]) => {
      const [client] = args;
      connection.next(args);
      context.subscribeMessages(subscribersMap, client, instance);

      const disconnectHook = adapter.bindClientDisconnect;
      disconnectHook &&
        disconnectHook.call(adapter, client, () => disconnect.next(client));
    };
  }

  public subscribeInitEvent(instance: NestGateway, event: Subject<any>) {
    if (instance.afterInit) {
      event.subscribe(instance.afterInit.bind(instance));
    }
  }

  public subscribeConnectionEvent(instance: NestGateway, event: Subject<any>) {
    if (instance.handleConnection) {
      event
        .pipe(
          distinctUntilChanged((prev, curr) => compareElementAt(prev, curr, 0)),
        )
        .subscribe((args: unknown[]) => instance.handleConnection!(...args));
    }
  }

  public subscribeDisconnectEvent(instance: NestGateway, event: Subject<any>) {
    if (instance.handleDisconnect) {
      event
        .pipe(distinctUntilChanged())
        .subscribe(instance.handleDisconnect.bind(instance));
    }
  }

  public subscribeMessages<T = any>(
    subscribersMap: MessageMappingProperties[],
    client: T,
    instance: NestGateway,
  ) {
    const adapter = this.config.getIoAdapter();
    const handlers = subscribersMap.map(({ callback, message }) => ({
      message,

      callback: callback.bind(instance, client),
    }));
    adapter.bindMessageHandlers(client, handlers, data =>
      fromPromise(this.pickResult(data)).pipe(mergeAll()),
    );
  }

  public async pickResult(
    deferredResult: Promise<any>,
  ): Promise<Observable<any>> {
    const result = await deferredResult;
    if (isObservable(result)) {
      return result;
    }
    if (result instanceof Promise) {
      return fromPromise(result);
    }
    return of(result);
  }

  public inspectEntrypointDefinitions(
    instance: NestGateway,
    port: number,
    messageHandlers: MessageMappingProperties[],
    instanceWrapperId: string,
  ) {
    messageHandlers.forEach(handler => {
      this.graphInspector.insertEntrypointDefinition<WebsocketEntrypointMetadata>(
        {
          type: 'websocket',
          methodName: handler.methodName,
          className: instance.constructor?.name,
          classNodeId: instanceWrapperId,
          metadata: {
            port,
            key: handler.message,
            message: handler.message,
          },
        },
        instanceWrapperId,
      );
    });
  }

  private assignServerToProperties<T = any>(
    instance: NestGateway,
    server: object,
  ) {
    for (const propertyKey of this.metadataExplorer.scanForServerHooks(
      instance,
    )) {
      Reflect.set(instance, propertyKey, server);
    }
  }

  private printSubscriptionLogs(
    instance: NestGateway,
    subscribersMap: MessageMappingProperties[],
  ) {
    const gatewayClassName = (instance as object)?.constructor?.name;
    if (!gatewayClassName) {
      return;
    }
    subscribersMap.forEach(({ message }) =>
      this.logger.log(
        `${gatewayClassName} subscribed to the "${message}" message`,
      ),
    );
  }
}
