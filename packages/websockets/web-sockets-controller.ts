import {
  from as fromPromise,
  isObservable,
  Observable,
  of,
  Subject,
} from 'rxjs';
import { distinctUntilChanged, mergeAll } from 'rxjs/operators';
import {
  GATEWAY_OPTIONS,
  MESSAGE_METADATA,
  PORT_METADATA,
} from './constants.js';
import { WsContextCreator } from './context/ws-context-creator.js';
import { InvalidSocketPortException } from './errors/invalid-socket-port.exception.js';
import { WsExceptionsHandler } from './exceptions/ws-exceptions-handler.js';
import {
  GatewayMetadataExplorer,
  MessageMappingProperties,
} from './gateway-metadata-explorer.js';
import { GatewayMetadata } from './interfaces/gateway-metadata.interface.js';
import { NestGateway } from './interfaces/nest-gateway.interface.js';
import { ServerAndEventStreamsHost } from './interfaces/server-and-event-streams-host.interface.js';
import { WebsocketEntrypointMetadata } from './interfaces/websockets-entrypoint-metadata.interface.js';
import { SocketServerProvider } from './socket-server-provider.js';
import { compareElementAt } from './utils/compare-element.util.js';
import { isFunction } from '@nestjs/common/internal';
import type { NestApplicationContextOptions } from '@nestjs/common/internal';
import { type Type, Logger } from '@nestjs/common';
import {
  type ApplicationConfig,
  ContextIdFactory,
  type ContextId,
  type GraphInspector,
  MetadataScanner,
  type NestContainer,
} from '@nestjs/core';
import {
  ExecutionContextHost,
  type Injector,
  type InstanceWrapper,
  type Module,
  REQUEST_CONTEXT_ID,
  STATIC_CONTEXT,
} from '@nestjs/core/internal';
import { ExceptionFiltersContext } from './context/exception-filters-context.js';

export class WebSocketsController {
  private readonly logger = new Logger(WebSocketsController.name, {
    timestamp: true,
  });
  private readonly metadataExplorer = new GatewayMetadataExplorer(
    new MetadataScanner(),
  );
  private readonly pendingDisconnects = new WeakMap<ContextId, number>();

  constructor(
    private readonly socketServerProvider: SocketServerProvider,
    private readonly config: ApplicationConfig,
    private readonly contextCreator: WsContextCreator,
    private readonly container: NestContainer,
    private readonly injector: Injector,
    private readonly exceptionFiltersContext: ExceptionFiltersContext,
    private readonly graphInspector: GraphInspector,
    private readonly appOptions: NestApplicationContextOptions = {},
  ) {}

  public connectGatewayToServer(
    instanceWrapper: InstanceWrapper<NestGateway>,
    moduleKey: string,
  ): void;
  public connectGatewayToServer(
    instance: NestGateway,
    metatype: Type<unknown> | Function,
    moduleKey: string,
    instanceWrapperId: string,
  ): void;
  public connectGatewayToServer(
    instanceOrWrapper: InstanceWrapper<NestGateway> | NestGateway,
    metatypeOrModuleKey: Type<unknown> | Function | string,
    moduleKey?: string,
    instanceWrapperId?: string,
  ) {
    const isInstanceWrapper =
      typeof metatypeOrModuleKey === 'string' &&
      'instance' in (instanceOrWrapper as InstanceWrapper<NestGateway>);
    const instance = isInstanceWrapper
      ? (instanceOrWrapper as InstanceWrapper<NestGateway>).instance
      : (instanceOrWrapper as NestGateway);
    const metatype = isInstanceWrapper
      ? (instanceOrWrapper as InstanceWrapper<NestGateway>).metatype
      : (metatypeOrModuleKey as Type<unknown> | Function);
    const targetModuleKey = isInstanceWrapper
      ? (metatypeOrModuleKey as string)
      : (moduleKey as string);
    const targetInstanceWrapperId = isInstanceWrapper
      ? (instanceOrWrapper as InstanceWrapper<NestGateway>).id
      : (instanceWrapperId as string);
    const instanceWrapper = isInstanceWrapper
      ? (instanceOrWrapper as InstanceWrapper<NestGateway>)
      : ({
          instance,
          metatype,
          id: targetInstanceWrapperId,
          isDependencyTreeStatic: () => true,
          isDependencyTreeDurable: () => false,
          getEnhancersMetadata: (): InstanceWrapper[] => [],
        } as InstanceWrapper<NestGateway>);
    const gatewayMetatype = metatype ?? instance.constructor;
    const options = Reflect.getMetadata(GATEWAY_OPTIONS, gatewayMetatype) || {};
    const port = Reflect.getMetadata(PORT_METADATA, gatewayMetatype) || 0;

    if (!Number.isInteger(port)) {
      throw new InvalidSocketPortException(port, gatewayMetatype);
    }
    this.subscribeToServerEvents(
      instanceWrapper,
      options,
      port,
      targetModuleKey,
      targetInstanceWrapperId,
    );
  }

  public subscribeToServerEvents<T extends GatewayMetadata>(
    instanceWrapper: InstanceWrapper<NestGateway>,
    options: T,
    port: number,
    moduleKey: string,
    instanceWrapperId: string,
  ): void;
  public subscribeToServerEvents<T extends GatewayMetadata>(
    instance: NestGateway,
    options: T,
    port: number,
    moduleKey: string,
    instanceWrapperId: string,
  ): void;
  public subscribeToServerEvents<T extends GatewayMetadata>(
    instanceOrWrapper: InstanceWrapper<NestGateway> | NestGateway,
    options: T,
    port: number,
    moduleKey: string,
    instanceWrapperId: string,
  ) {
    const instanceWrapper =
      'instance' in (instanceOrWrapper as object)
        ? (instanceOrWrapper as InstanceWrapper<NestGateway>)
        : ({
            instance: instanceOrWrapper,
            metatype: (instanceOrWrapper as NestGateway).constructor,
            id: instanceWrapperId,
            isDependencyTreeStatic: () => true,
            isDependencyTreeDurable: () => false,
            getEnhancersMetadata: (): InstanceWrapper[] => [],
          } as InstanceWrapper<NestGateway>);
    const { instance } = instanceWrapper;
    const nativeMessageHandlers = this.metadataExplorer.explore(instance);
    const isStatic = instanceWrapper.isDependencyTreeStatic();
    const hasGlobalScopedEnhancers = this.getGlobalScopedEnhancers().length > 0;
    const moduleRef = this.container.getModuleByKey(moduleKey)!;
    const messageHandlers = nativeMessageHandlers.map(
      ({ callback, isAckHandledManually, message, methodName }) => ({
        message,
        methodName,
        callback:
          isStatic && !hasGlobalScopedEnhancers
            ? this.contextCreator.create(
                instance,
                callback,
                moduleKey,
                methodName,
                STATIC_CONTEXT,
                instanceWrapper.id,
              )
            : this.createRequestScopedHandler(
                instanceWrapper,
                moduleRef,
                moduleKey,
                methodName,
              ),
        isAckHandledManually,
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
    this.subscribeEvents(
      instanceWrapper,
      messageHandlers,
      observableServer,
      isStatic
        ? this.createStaticEventHandler(instance, moduleKey, 'handleConnection')
        : this.createRequestScopedEventHandler(
            instanceWrapper,
            moduleRef,
            moduleKey,
            'handleConnection',
            observableServer.server,
          ),
      isStatic && !hasGlobalScopedEnhancers
        ? this.createStaticEventHandler(instance, moduleKey, 'handleDisconnect')
        : this.createRequestScopedEventHandler(
            instanceWrapper,
            moduleRef,
            moduleKey,
            'handleDisconnect',
            observableServer.server,
          ),
    );
  }

  public subscribeEvents(
    instanceWrapper: InstanceWrapper<NestGateway>,
    subscribersMap: MessageMappingProperties[],
    observableServer: ServerAndEventStreamsHost,
    connectionHandler?: Function,
    disconnectHandler?: Function,
  ) {
    const { instance } = instanceWrapper;
    const { init, disconnect, connection, server } = observableServer;
    const adapter = this.config.getIoAdapter();

    this.subscribeInitEvent(instance, init);
    this.subscribeConnectionEvent(connectionHandler, connection);
    this.subscribeDisconnectEvent(disconnectHandler, disconnect);

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
        disconnectHook.call(adapter, client, (reason?: string) =>
          disconnect.next({ client, reason }),
        );
    };
  }

  public subscribeInitEvent(instance: NestGateway, event: Subject<any>) {
    if (instance.afterInit) {
      event.subscribe(instance.afterInit.bind(instance));
    }
  }

  public subscribeConnectionEvent(
    handlerOrGateway: Function | NestGateway | undefined,
    event: Subject<any>,
  ) {
    const handler =
      typeof handlerOrGateway === 'function'
        ? handlerOrGateway
        : handlerOrGateway?.handleConnection?.bind(handlerOrGateway);
    if (handler) {
      event
        .pipe(
          distinctUntilChanged((prev, curr) => compareElementAt(prev, curr, 0)),
        )
        .subscribe((args: unknown[]) => handler(...args));
    }
  }

  public subscribeDisconnectEvent(
    handlerOrGateway: Function | NestGateway | undefined,
    event: Subject<any>,
  ) {
    const handler =
      typeof handlerOrGateway === 'function'
        ? handlerOrGateway
        : handlerOrGateway?.handleDisconnect?.bind(handlerOrGateway);
    if (handler) {
      event
        .pipe(
          distinctUntilChanged((prev, curr) => {
            const prevClient = prev?.client || prev;
            const currClient = curr?.client || curr;
            return prevClient === currClient;
          }),
        )
        .subscribe((data: any) => {
          if (data && typeof data === 'object' && 'client' in data) {
            handler(data.client, data.reason);
          } else {
            // Backward compatibility: if it's just the client
            handler(data);
          }
        });
    }
  }

  public subscribeMessages<T = any>(
    subscribersMap: MessageMappingProperties[],
    client: T,
    instance: NestGateway,
  ) {
    const adapter = this.config.getIoAdapter();
    const handlers = subscribersMap.map(
      ({ callback, message, isAckHandledManually }) => ({
        message,
        callback: callback.bind(instance, client),
        isAckHandledManually,
      }),
    );
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

  public createRequestScopedHandler(
    instanceWrapper: InstanceWrapper<NestGateway>,
    moduleRef: Module,
    moduleKey: string,
    methodName: string,
  ) {
    const { instance } = instanceWrapper;
    const collection = moduleRef.providers;
    const isStatic = instanceWrapper.isDependencyTreeStatic();
    const isTreeDurable = isStatic
      ? this.areGlobalScopedEnhancersDurable()
      : instanceWrapper.isDependencyTreeDurable();
    const scopedEnhancers = [
      ...(isStatic ? instanceWrapper.getEnhancersMetadata() || [] : []),
      ...this.getGlobalScopedEnhancers(),
    ];
    const pattern =
      Reflect.getMetadata(MESSAGE_METADATA, instance[methodName]) ?? 'unknown';
    // Kept per gateway, not per handler function: gateways that inherit the
    // handler from a base class can declare different filters
    let exceptionFilter: WsExceptionsHandler | undefined;

    return async (...args: unknown[]) => {
      const [client] = args;

      try {
        const contextId = this.getContextId(
          client as Record<any, any>,
          isTreeDurable,
        );
        const contextInstance = isStatic
          ? instance
          : await this.injector.loadPerContext(
              instance,
              moduleRef,
              collection,
              contextId,
            );
        // Resolve global enhancers without adding them to the gateway's dependency
        // tree, so a singleton gateway keeps its state and lifecycle hooks.
        await this.injector.loadEnhancersPerContext(
          instanceWrapper,
          contextId,
          instanceWrapper,
          scopedEnhancers,
        );
        await this.injector.waitForDeferredLoads(contextId);
        return this.contextCreator.create(
          contextInstance,
          contextInstance[methodName],
          moduleKey,
          methodName,
          contextId,
          instanceWrapper.id,
        )(...args);
      } catch (err) {
        exceptionFilter ??= this.exceptionFiltersContext.create(
          instance,
          instance[methodName],
          moduleKey,
        );
        // The context failed to resolve before `WsProxy` could append the
        // pattern, so add it here the same way.
        const host = new ExecutionContextHost([...args, pattern]);
        host.setType('ws');
        exceptionFilter.handle(err as Error, host);
      }
    };
  }

  public createRequestScopedEventHandler(
    instanceWrapper: InstanceWrapper<NestGateway>,
    moduleRef: Module,
    moduleKey: string,
    methodName: 'handleConnection' | 'handleDisconnect',
    server: object,
  ) {
    const { instance } = instanceWrapper;
    const collection = moduleRef.providers;
    const isStatic = instanceWrapper.isDependencyTreeStatic();
    const isTreeDurable = isStatic
      ? this.areGlobalScopedEnhancersDurable()
      : instanceWrapper.isDependencyTreeDurable();
    const targetCallback = instance[methodName];

    return async (...args: unknown[]) => {
      const [client] = args;
      let contextId: ContextId | undefined;
      let isResolved = false;

      try {
        contextId = this.getContextId(
          client as Record<any, any>,
          isTreeDurable,
        );
        if (methodName === 'handleDisconnect') {
          this.pendingDisconnects.set(
            contextId,
            (this.pendingDisconnects.get(contextId) ?? 0) + 1,
          );
        }
        const contextInstance = isStatic
          ? instance
          : await this.injector.loadPerContext(
              instance,
              moduleRef,
              collection,
              contextId,
            );
        isResolved = true;
        if (!isStatic) {
          this.assignServerToProperties(contextInstance, server);
        }
        const scopedMethod = contextInstance[methodName] as
          ((...methodArgs: unknown[]) => unknown) | undefined;
        return await scopedMethod?.apply(contextInstance, args);
      } catch (err) {
        if (!targetCallback) {
          // The gateway failed to resolve and has no hook whose exception
          // filters could handle the error. Nothing awaits this handler, so
          // rethrowing would end as an unhandled rejection.
          this.logResolutionError(instance, methodName, err);
          return;
        }
        if (!isResolved && contextId) {
          // The gateway's enhancers are created in the context of the
          // connection along with it, so when it failed to resolve, its
          // filters have to be created here.
          try {
            await this.injector.loadEnhancersPerContext(
              instanceWrapper,
              contextId,
              instanceWrapper,
            );
          } catch {
            this.logResolutionError(instance, methodName, err);
            return;
          }
        }
        // Built for each connection: a request-scoped filter is only
        // constructed in the context of the connection, and the static one
        // holds an empty placeholder
        const exceptionFilter = this.exceptionFiltersContext.create(
          instance,
          targetCallback,
          moduleKey,
          contextId,
          instanceWrapper.id,
        );
        this.handleLifecycleHookError(exceptionFilter, methodName, args, err);
      } finally {
        if (methodName === 'handleDisconnect' && contextId) {
          this.cleanupRequestScopedContext(
            instanceWrapper,
            contextId,
            client as Record<any, any>,
          );
        }
      }
    };
  }

  private logResolutionError(
    instance: NestGateway,
    methodName: 'handleConnection' | 'handleDisconnect',
    err: unknown,
  ) {
    this.logger.error(
      `Failed to resolve ${instance.constructor.name} on client ${methodName === 'handleConnection' ? 'connection' : 'disconnection'}`,
      (err as Error)?.stack,
    );
  }

  // A default-scoped gateway is resolved per connection only for its global
  // scoped enhancers, so their trees decide whether the context is durable
  // (mirrors InstanceWrapper#isDependencyTreeDurable).
  private areGlobalScopedEnhancersDurable(): boolean {
    const scopedEnhancers = this.getGlobalScopedEnhancers().filter(
      wrapper => !wrapper.isDependencyTreeStatic(),
    );
    return (
      scopedEnhancers.length > 0 &&
      scopedEnhancers.every(wrapper => wrapper.isDependencyTreeDurable())
    );
  }

  /**
   * Runs a lifecycle hook of a default-scoped gateway and passes the errors it
   * throws or rejects with to the gateway's exception filters, as for message
   * handlers. The hook still runs synchronously.
   */
  public createStaticEventHandler(
    instance: NestGateway,
    moduleKey: string,
    methodName: 'handleConnection' | 'handleDisconnect',
  ) {
    const hook = instance[methodName] as
      ((...args: unknown[]) => unknown) | undefined;
    if (!hook) {
      return undefined;
    }
    // Kept per gateway, not per hook function: gateways that inherit the
    // hook from a base class can declare different filters
    let exceptionFilter: WsExceptionsHandler | undefined;
    return (...args: unknown[]) => {
      const handleError = (err: unknown) => {
        exceptionFilter ??= this.exceptionFiltersContext.create(
          instance,
          hook,
          moduleKey,
        );
        this.handleLifecycleHookError(exceptionFilter, methodName, args, err);
      };
      try {
        const result = hook.apply(instance, args);
        return isFunction((result as Promise<unknown>)?.then)
          ? (result as Promise<unknown>).catch(handleError)
          : result;
      } catch (err) {
        handleError(err);
      }
    };
  }

  private handleLifecycleHookError(
    exceptionFilter: WsExceptionsHandler,
    methodName: 'handleConnection' | 'handleDisconnect',
    args: unknown[],
    err: unknown,
  ) {
    const [client, disconnectReason] = args;
    // Client first, data second and the pattern last, as for message handlers.
    // With the raw hook arguments, the filter would send the last one (the
    // socket itself with socket.io, the upgrade request with ws) back to the
    // client as the pattern. The disconnect reason is safe to pass as data,
    // as nothing is sent to a client that has already disconnected.
    const data =
      methodName === 'handleDisconnect' ? disconnectReason : undefined;
    const host = new ExecutionContextHost([client, data, methodName]);
    host.setType('ws');
    exceptionFilter.handle(err as Error, host);
  }

  private getGlobalScopedEnhancers(): InstanceWrapper[] {
    return [
      ...this.config.getGlobalRequestGuards(),
      ...this.config.getGlobalRequestPipes(),
      ...this.config.getGlobalRequestInterceptors(),
    ];
  }

  public getContextId<T extends Record<any, unknown> = any>(
    request: T,
    isTreeDurable: boolean,
  ): ContextId {
    const contextId = ContextIdFactory.getByRequest(request);
    if (!request[REQUEST_CONTEXT_ID as any]) {
      Object.defineProperty(request, REQUEST_CONTEXT_ID, {
        value: contextId,
        enumerable: false,
        writable: false,
        configurable: true,
      });

      const requestProviderValue = isTreeDurable
        ? contextId.payload
        : Object.assign(request, contextId.payload);
      this.container.registerRequestProvider(requestProviderValue, contextId);
    }
    return contextId;
  }

  private cleanupRequestScopedContext(
    _instanceWrapper: InstanceWrapper<NestGateway>,
    contextId: ContextId,
    request: Record<any, any>,
  ) {
    const remaining = (this.pendingDisconnects.get(contextId) ?? 1) - 1;
    if (remaining > 0) {
      this.pendingDisconnects.set(contextId, remaining);
      return;
    }
    this.pendingDisconnects.delete(contextId);
    // Other gateways can still be executing their asynchronous disconnect hooks.
    // A finished cycle must also never remove a newer context on the same client.
    if (request[REQUEST_CONTEXT_ID as any] === contextId) {
      Reflect.deleteProperty(request, REQUEST_CONTEXT_ID as any);
    }
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
