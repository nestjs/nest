import { Type } from '@nestjs/common/interfaces/type.interface';
import { Logger } from '@nestjs/common/services/logger.service';
import { ApplicationConfig } from '@nestjs/core/application-config';
import { MetadataScanner } from '@nestjs/core/metadata-scanner';
import {
  from as fromPromise,
  isObservable,
  mergeMap,
  Observable,
  of,
} from 'rxjs';
import { mergeAll } from 'rxjs/operators';
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
import { SocketServerProvider } from './socket-server-provider';
import {
  ContextId,
  InstanceWrapper,
} from '@nestjs/core/injector/instance-wrapper';
import { ContextIdFactory } from '@nestjs/core';
import { REQUEST_CONTEXT_ID } from '@nestjs/core/router/request/request-constants';
import { Injector } from '@nestjs/core/injector/injector';
import { NestContainer } from '@nestjs/core/injector/container';
import { Module } from '@nestjs/core/injector/module';
import { ClientAndEventStreamsHost } from './interfaces/client-and-event-streams-host.interface';

export class WebSocketsController {
  private readonly logger = new Logger(WebSocketsController.name, {
    timestamp: true,
  });
  private readonly metadataExplorer = new GatewayMetadataExplorer(
    new MetadataScanner(),
  );

  constructor(
    private readonly container: NestContainer,
    private readonly injector: Injector,
    private readonly socketServerProvider: SocketServerProvider,
    private readonly config: ApplicationConfig,
    private readonly contextCreator: WsContextCreator,
  ) {}

  public connectGatewayToServer(
    wrapper: InstanceWrapper<NestGateway>,
    metatype: Type<unknown> | Function,
    moduleKey: string,
  ) {
    const options = Reflect.getMetadata(GATEWAY_OPTIONS, metatype) || {};
    const port = Reflect.getMetadata(PORT_METADATA, metatype) || 0;

    if (!Number.isInteger(port)) {
      throw new InvalidSocketPortException(port, metatype);
    }

    this.subscribeToServerEvents(wrapper, options, port, moduleKey);
  }

  public subscribeToServerEvents<T extends GatewayMetadata>(
    wrapper: InstanceWrapper<NestGateway>,
    options: T,
    port: number,
    moduleKey: string,
  ) {
    const { instance } = wrapper;
    const messageHandlers = this.metadataExplorer.explore(instance);
    const observableServer = this.socketServerProvider.scanForSocketServer<T>(
      options,
      port,
    );

    if (wrapper.isDependencyTreeStatic()) {
      this.subscribeEvents(
        instance,
        messageHandlers,
        observableServer,
        moduleKey,
      );
    } else {
      const moduleRef = this.container.getModuleByKey(moduleKey);

      this.subscribeEventsWithRequestScope(
        instance,
        messageHandlers,
        observableServer,
        moduleRef,
        moduleKey,
      );
    }
  }

  private createSubscriberMap(
    instance: NestGateway,
    messageHandlers: MessageMappingProperties[],
    moduleKey,
  ): MessageMappingProperties[] {
    return messageHandlers.map(({ callback, message, methodName }) => ({
      message,
      methodName,
      callback: this.contextCreator.create(
        instance,
        callback,
        moduleKey,
        methodName,
      ),
    }));
  }

  public subscribeEvents(
    instance: NestGateway,
    messageHandlers: MessageMappingProperties[],
    observableServer: ServerAndEventStreamsHost,
    moduleKey: string,
  ) {
    const subscriberMap = this.createSubscriberMap(
      instance,
      messageHandlers,
      moduleKey,
    );

    this.assignServerToProperties(instance, observableServer.server);

    this.subscribeInitEvent(instance, observableServer.init);
    this.subscribeConnectionEvent(instance, observableServer.connection);
    this.subscribeDisconnectEvent(
      instance,
      this.getDisconnectObservable(observableServer),
    );

    observableServer.connection.subscribe(({ client }) => {
      this.subscribeMessages(subscriberMap, client, instance);
    });

    this.printSubscriptionLogs(instance, messageHandlers);
  }

  public subscribeEventsWithRequestScope(
    instance: NestGateway,
    messageHandlers: MessageMappingProperties[],
    observableServer: ServerAndEventStreamsHost,
    moduleRef: Module,
    moduleKey: string,
  ) {
    const collection = moduleRef.controllers;

    observableServer.connection.subscribe(async observableClient => {
      const { client, request, disconnect } = observableClient;

      const contextId = this.getContextId(client, request);
      const contextInstance = await this.injector.loadPerContext(
        instance,
        moduleRef,
        collection,
        contextId,
      );

      const subscriberMap = this.createSubscriberMap(
        instance,
        messageHandlers,
        moduleKey,
      );

      this.assignServerToProperties(contextInstance, observableServer.server);

      this.subscribeMessages(subscriberMap, client, contextInstance);

      this.subscribeConnectionEvent(contextInstance, of(observableClient));
      this.subscribeDisconnectEvent(contextInstance, disconnect);
    });

    this.printSubscriptionLogs(instance, messageHandlers);
  }

  public subscribeInitEvent(instance: NestGateway, event: Observable<any>) {
    if (instance.afterInit) {
      event.subscribe(instance.afterInit.bind(instance));
    }
  }

  public subscribeConnectionEvent(
    instance: NestGateway,
    event: Observable<ClientAndEventStreamsHost>,
  ) {
    if (instance.handleConnection) {
      event.subscribe(({ client, request }) =>
        instance.handleConnection(client, request),
      );
    }
  }

  public subscribeDisconnectEvent(
    instance: NestGateway,
    event: Observable<any>,
  ) {
    if (instance.handleDisconnect) {
      event.subscribe(instance.handleDisconnect.bind(instance));
    }
  }

  private getDisconnectObservable(observableServer: ServerAndEventStreamsHost) {
    return observableServer.connection.pipe(
      mergeMap(({ disconnect }) => disconnect),
    );
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
    const gatewayClassName = (instance as Object)?.constructor?.name;
    if (!gatewayClassName) {
      return;
    }
    subscribersMap.forEach(({ message }) =>
      this.logger.log(
        `${gatewayClassName} subscribed to the "${message}" message`,
      ),
    );
  }

  private getContextId(client: any, request: any): ContextId {
    const contextId = ContextIdFactory.getByRequest(request);
    if (!client[REQUEST_CONTEXT_ID as any]) {
      Object.defineProperty(client, REQUEST_CONTEXT_ID, {
        value: contextId,
        enumerable: false,
        writable: false,
        configurable: false,
      });
      this.container.registerRequestProvider(request, contextId);
    }
    return contextId;
  }
}
