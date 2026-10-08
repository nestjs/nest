import { Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Injector } from '@nestjs/core/injector/injector.js';
import { Module } from '@nestjs/core/injector/module.js';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper.js';
import { REQUEST_CONTEXT_ID } from '@nestjs/core/router/request/request-constants.js';
import { NestContainer } from '@nestjs/core';
import { ApplicationConfig } from '@nestjs/core/application-config.js';
import { fromEvent, lastValueFrom, Observable, of } from 'rxjs';
import { GraphInspector } from '../../core/inspector/graph-inspector.js';
import { MetadataScanner } from '../../core/metadata-scanner.js';
import { AbstractWsAdapter } from '../adapters/ws-adapter.js';
import { PORT_METADATA } from '../constants.js';
import { ExceptionFiltersContext } from '../context/exception-filters-context.js';
import { WsContextCreator } from '../context/ws-context-creator.js';
import { WebSocketGateway } from '../decorators/socket-gateway.decorator.js';
import { InvalidSocketPortException } from '../errors/invalid-socket-port.exception.js';
import {
  GatewayMetadataExplorer,
  MessageMappingProperties,
} from '../gateway-metadata-explorer.js';
import { SocketServerProvider } from '../socket-server-provider.js';
import { WebSocketsController } from '../web-sockets-controller.js';

class NoopAdapter extends AbstractWsAdapter {
  public create(port: number, options?: any) {}
  public bindMessageHandlers(
    client: any,
    handlers,
    transform: (data: any) => Observable<any>,
  ) {
    handlers.forEach(({ message, callback }) => {
      const source$ = fromEvent(client, message);
      source$.subscribe(data => null);
    });
  }
}

describe('WebSocketsController', () => {
  let instance: WebSocketsController;
  let untypedInstance: any;
  let provider: SocketServerProvider,
    graphInspector: GraphInspector,
    config: ApplicationConfig,
    container: NestContainer,
    injector: Injector,
    exceptionFiltersContext: ExceptionFiltersContext;

  const messageHandlerCallback = () => Promise.resolve();
  const port = 90,
    namespace = '/';
  @WebSocketGateway(port, { namespace })
  class Test {}

  beforeEach(() => {
    container = new NestContainer();
    config = new ApplicationConfig(new NoopAdapter());
    provider = new SocketServerProvider(null!, config);
    graphInspector = new GraphInspector(container);
    injector = new Injector();
    exceptionFiltersContext = new ExceptionFiltersContext(container);

    const contextCreator = {
      ...Object.fromEntries(
        Object.getOwnPropertyNames(WsContextCreator.prototype).map(m => [
          m,
          vi.fn(),
        ]),
      ),
    } as any;
    contextCreator.create.mockReturnValue(messageHandlerCallback);
    instance = new WebSocketsController(
      provider,
      config,
      contextCreator,
      container,
      injector,
      exceptionFiltersContext,
      graphInspector,
    );
    untypedInstance = instance as any;
  });
  describe('connectGatewayToServer', () => {
    let subscribeToServerEvents: ReturnType<typeof vi.fn>;

    @WebSocketGateway('test' as any)
    class InvalidGateway {}

    @WebSocketGateway()
    class DefaultGateway {}

    beforeEach(() => {
      subscribeToServerEvents = vi.fn();
      untypedInstance.subscribeToServerEvents = subscribeToServerEvents;
    });
    it('should throw "InvalidSocketPortException" when port is not a number', () => {
      Reflect.defineMetadata(PORT_METADATA, 'test', InvalidGateway);
      expect(() =>
        instance.connectGatewayToServer(
          {
            instance: new InvalidGateway(),
            metatype: InvalidGateway,
            id: 'instanceWrapperId',
          } as any,
          'moduleKey',
        ),
      ).toThrow(InvalidSocketPortException);
    });
    it('should call "subscribeToServerEvents" with default values when metadata is empty', () => {
      const gateway = new DefaultGateway();
      instance.connectGatewayToServer(
        {
          instance: gateway,
          metatype: DefaultGateway,
          id: 'instanceWrapperId',
        } as any,
        'moduleKey',
      );
      expect(subscribeToServerEvents).toHaveBeenCalledWith(
        {
          instance: gateway,
          metatype: DefaultGateway,
          id: 'instanceWrapperId',
        },
        {},
        0,
        'moduleKey',
        'instanceWrapperId',
      );
    });
    it('should call "subscribeToServerEvents" when metadata is valid', () => {
      const gateway = new Test();
      instance.connectGatewayToServer(
        {
          instance: gateway,
          metatype: Test,
          id: 'instanceWrapperId',
        } as any,
        'moduleKey',
      );
      expect(subscribeToServerEvents).toHaveBeenCalledWith(
        {
          instance: gateway,
          metatype: Test,
          id: 'instanceWrapperId',
        },
        { namespace },
        port,
        'moduleKey',
        'instanceWrapperId',
      );
    });
  });
  describe('subscribeToServerEvents', () => {
    let explorer: GatewayMetadataExplorer,
      gateway,
      handlers,
      server,
      assignServerToProperties: ReturnType<typeof vi.fn>,
      subscribeEvents: ReturnType<typeof vi.fn>;
    const handlerCallback = () => {};

    beforeEach(() => {
      gateway = new Test();
      explorer = new GatewayMetadataExplorer(new MetadataScanner());
      untypedInstance.metadataExplorer = explorer;
      vi.spyOn(container, 'getModuleByKey').mockReturnValue({
        providers: new Map(),
      } as any);

      handlers = [
        {
          message: 'message',
          methodName: 'methodName',
          callback: handlerCallback,
          isAckHandledManually: false,
        },
      ];
      server = { server: 'test' };

      vi.spyOn(explorer, 'explore').mockReturnValue(handlers);
      vi.spyOn(provider, 'scanForSocketServer').mockReturnValue(server);

      assignServerToProperties = vi.fn();
      subscribeEvents = vi.fn();
      untypedInstance.assignServerToProperties = assignServerToProperties;
      untypedInstance.subscribeEvents = subscribeEvents;
    });
    it('should call "assignServerToProperties" with expected arguments', () => {
      instance.subscribeToServerEvents(
        {
          instance: gateway,
          metatype: Test,
          id: 'instanceWrapperId',
          isDependencyTreeStatic: () => true,
        } as any,
        { namespace },
        port,
        'moduleKey',
        'instanceWrapperId',
      );
      expect(assignServerToProperties).toHaveBeenCalledWith(
        gateway,
        server.server,
      );
    });
    it('should call "subscribeEvents" with expected arguments', () => {
      instance.subscribeToServerEvents(
        {
          instance: gateway,
          metatype: Test,
          id: 'instanceWrapperId',
          isDependencyTreeStatic: () => true,
        } as any,
        { namespace },
        port,
        'moduleKey',
        'instanceWrapperId',
      );
      expect(subscribeEvents.mock.calls[0][0]).toEqual({
        instance: gateway,
        metatype: Test,
        id: 'instanceWrapperId',
        isDependencyTreeStatic: expect.any(Function),
      });
      expect(subscribeEvents.mock.calls[0][2]).toBe(server);
      expect(subscribeEvents.mock.calls[0][1]).toEqual([
        {
          message: 'message',
          methodName: 'methodName',
          callback: messageHandlerCallback,
          isAckHandledManually: false,
        },
      ]);
    });
  });
  describe('inspectEntrypointDefinitions', () => {
    it('should inspect & insert corresponding entrypoint definitions', () => {
      class GatewayHostCls {}

      const port = 80;
      const instanceWrapperId = '1234';
      const messageHandlers: MessageMappingProperties[] = [
        {
          methodName: 'findOne',
          message: 'find',
          callback: null!,
          isAckHandledManually: false,
        },
        {
          methodName: 'create',
          message: 'insert',
          callback: null!,
          isAckHandledManually: false,
        },
      ];
      const insertEntrypointDefinitionSpy = vi.spyOn(
        graphInspector,
        'insertEntrypointDefinition',
      );
      instance.inspectEntrypointDefinitions(
        new GatewayHostCls(),
        port,
        messageHandlers,
        instanceWrapperId,
      );

      expect(insertEntrypointDefinitionSpy).toHaveBeenCalledTimes(2);
      expect(insertEntrypointDefinitionSpy).toHaveBeenCalledWith(
        {
          type: 'websocket',
          methodName: messageHandlers[0].methodName,
          className: GatewayHostCls.name,
          classNodeId: instanceWrapperId,
          metadata: {
            port,
            key: messageHandlers[0].message,
            message: messageHandlers[0].message,
          } as any,
        },
        instanceWrapperId,
      );
      expect(insertEntrypointDefinitionSpy).toHaveBeenCalledWith(
        {
          type: 'websocket',
          methodName: messageHandlers[1].methodName,
          className: GatewayHostCls.name,
          classNodeId: instanceWrapperId,
          metadata: {
            port,
            key: messageHandlers[1].message,
            message: messageHandlers[1].message,
          } as any,
        },
        instanceWrapperId,
      );
    });
  });
  describe('subscribeEvents', () => {
    const gateway = new Test();

    let handlers: any;
    let server: any,
      subscribeConnectionEvent: ReturnType<typeof vi.fn>,
      subscribeDisconnectEvent: ReturnType<typeof vi.fn>,
      nextSpy: ReturnType<typeof vi.fn>,
      onSpy: ReturnType<typeof vi.fn>,
      subscribeInitEvent: ReturnType<typeof vi.fn>,
      getConnectionHandler: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      nextSpy = vi.fn();
      onSpy = vi.fn();
      subscribeInitEvent = vi.fn();
      getConnectionHandler = vi.fn();
      getConnectionHandler.mockReturnValue('connection-handler');
      subscribeConnectionEvent = vi.fn();
      subscribeDisconnectEvent = vi.fn();

      handlers = ['test'];
      server = {
        server: {
          on: onSpy,
        },
        init: {
          next: nextSpy,
        },
        disconnect: {},
        connection: {},
      };
      untypedInstance.subscribeInitEvent = subscribeInitEvent;
      untypedInstance.getConnectionHandler = getConnectionHandler;
      untypedInstance.subscribeConnectionEvent = subscribeConnectionEvent;
      untypedInstance.subscribeDisconnectEvent = subscribeDisconnectEvent;
    });

    it('should call "subscribeConnectionEvent" with expected arguments', () => {
      instance.subscribeEvents({ instance: gateway } as any, handlers, server);
      expect(subscribeConnectionEvent).toHaveBeenCalledWith(
        (gateway as any).handleConnection?.bind(gateway),
        server.connection,
      );
    });
    it('should call "subscribeDisconnectEvent" with expected arguments', () => {
      instance.subscribeEvents({ instance: gateway } as any, handlers, server);
      expect(subscribeDisconnectEvent).toHaveBeenCalledWith(
        (gateway as any).handleDisconnect?.bind(gateway),
        server.disconnect,
      );
    });
    it('should call "subscribeInitEvent" with expected arguments', () => {
      instance.subscribeEvents({ instance: gateway } as any, handlers, server);
      expect(subscribeInitEvent).toHaveBeenCalledWith(gateway, server.init);
    });
    it('should bind connection handler to server', () => {
      instance.subscribeEvents({ instance: gateway } as any, handlers, server);
      expect(onSpy).toHaveBeenCalledWith('connection', 'connection-handler');
    });
    it('should call "getConnectionHandler" with expected arguments', () => {
      instance.subscribeEvents({ instance: gateway } as any, handlers, server);
      expect(getConnectionHandler).toHaveBeenCalledWith(
        instance,
        gateway,
        handlers,
        server.disconnect,
        server.connection,
      );
    });
  });
  describe('createRequestScopedHandler', () => {
    it('should load global enhancers for a singleton without resolving the gateway per context', async () => {
      class Gateway {
        onMessage() {}
      }
      const gateway = new Gateway();
      const wrapper = new InstanceWrapper({
        token: Gateway,
        metatype: Gateway,
        instance: gateway,
        isResolved: true,
      });
      const moduleRef = {
        providers: new Map([[Gateway, wrapper]]),
      } as Module;
      const guard = new InstanceWrapper();
      const pipe = new InstanceWrapper();
      const interceptor = new InstanceWrapper();
      config.addGlobalRequestGuard(guard);
      config.addGlobalRequestPipe(pipe);
      config.addGlobalRequestInterceptor(interceptor);
      config.addGlobalRequestFilter(new InstanceWrapper());
      vi.spyOn(container, 'registerRequestProvider').mockImplementation(
        () => undefined,
      );
      const loadGateway = vi.spyOn(injector, 'loadPerContext');
      const loadEnhancers = vi
        .spyOn(injector, 'loadEnhancersPerContext')
        .mockResolvedValue();
      const createContext = vi.spyOn(untypedInstance.contextCreator, 'create');
      const client = {};

      await instance.createRequestScopedHandler(
        wrapper,
        moduleRef,
        'moduleKey',
        'onMessage',
      )(client);

      expect(loadGateway).not.toHaveBeenCalled();
      expect(loadEnhancers).toHaveBeenCalledWith(
        wrapper,
        client[REQUEST_CONTEXT_ID as any],
        wrapper,
        [guard, pipe, interceptor],
      );
      expect(createContext).toHaveBeenCalledWith(
        gateway,
        gateway.onMessage,
        'moduleKey',
        'onMessage',
        client[REQUEST_CONTEXT_ID as any],
        wrapper.id,
      );
      expect(wrapper.isDependencyTreeStatic()).toBe(true);
      expect(wrapper.getEnhancersMetadata()).toBeUndefined();
    });

    it.each([
      [true, true],
      [false, false],
      [undefined, false],
    ])(
      'should take the durability of the global enhancers for a singleton (durable: %s)',
      async (durable, expected) => {
        class Gateway {
          onMessage() {}
        }
        const wrapper = new InstanceWrapper({
          token: Gateway,
          metatype: Gateway,
          instance: new Gateway(),
          isResolved: true,
        });
        config.addGlobalRequestGuard(
          new InstanceWrapper({ scope: Scope.REQUEST, durable }),
        );
        vi.spyOn(container, 'registerRequestProvider').mockImplementation(
          () => undefined,
        );
        vi.spyOn(injector, 'loadEnhancersPerContext').mockResolvedValue();
        vi.spyOn(untypedInstance.contextCreator, 'create').mockReturnValue(
          () => undefined,
        );
        const getContextId = vi.spyOn(instance, 'getContextId');
        const client = {};

        await instance.createRequestScopedHandler(
          wrapper,
          { providers: new Map([[Gateway, wrapper]]) } as Module,
          'moduleKey',
          'onMessage',
        )(client);

        expect(getContextId).toHaveBeenCalledWith(client, expected);
      },
    );

    it('should reuse the same context id for the same client', async () => {
      const client = {};
      const moduleRef = {
        providers: new Map(),
      } as Module;
      const instanceWrapper = {
        id: 'wrapper-id',
        instance: { onMessage() {} },
        isDependencyTreeStatic: () => false,
        isDependencyTreeDurable: () => false,
      } as any;
      const perContextMethod = vi.fn();
      const perContextInstance = {
        onMessage: perContextMethod,
      };
      const loadPerContext = vi
        .spyOn(injector, 'loadPerContext')
        .mockResolvedValue(perContextInstance as never);
      vi.spyOn(container, 'registerRequestProvider').mockImplementation(
        () => undefined,
      );

      const createSpy = vi
        .spyOn(untypedInstance.contextCreator, 'create')
        .mockImplementation(
          (contextInstance: any, callback: (...args: unknown[]) => unknown) =>
            (...args: unknown[]) =>
              callback.apply(contextInstance, args),
        );

      const handler = instance.createRequestScopedHandler(
        instanceWrapper,
        moduleRef,
        'moduleKey',
        'onMessage',
      );

      await handler(client, 'first');
      await handler(client, 'second');

      expect(loadPerContext).toHaveBeenCalledTimes(2);
      expect(loadPerContext.mock.calls[0][3]).toBe(
        loadPerContext.mock.calls[1][3],
      );
      expect(createSpy.mock.calls[0][4]).toBe(createSpy.mock.calls[1][4]);
      expect(container.registerRequestProvider).toHaveBeenCalledTimes(1);
      expect(client[REQUEST_CONTEXT_ID as any]).toBeDefined();
      expect(perContextMethod).toHaveBeenCalledWith(client, 'first');
      expect(perContextMethod).toHaveBeenCalledWith(client, 'second');
    });
  });
  describe('createRequestScopedEventHandler', () => {
    it('should release a singleton connection context even without a disconnect hook', async () => {
      class Gateway {}
      const wrapper = new InstanceWrapper({
        token: Gateway,
        metatype: Gateway,
        instance: new Gateway(),
        isResolved: true,
      });
      const moduleRef = {
        providers: new Map([[Gateway, wrapper]]),
      } as Module;
      const client = {};
      vi.spyOn(container, 'registerRequestProvider').mockImplementation(
        () => undefined,
      );
      const loadGateway = vi.spyOn(injector, 'loadPerContext');
      instance.getContextId(client, false);
      expect(client[REQUEST_CONTEXT_ID as any]).toBeDefined();

      await instance.createRequestScopedEventHandler(
        wrapper,
        moduleRef,
        'moduleKey',
        'handleDisconnect',
        {},
      )(client);

      expect(loadGateway).not.toHaveBeenCalled();
      expect(client[REQUEST_CONTEXT_ID as any]).toBeUndefined();
    });

    it('should retain a shared context until all disconnect hooks finish', async () => {
      let release: () => void;
      const pending = new Promise<void>(resolve => {
        release = resolve;
      });
      const fast = { handleDisconnect: vi.fn() };
      let contextDuringSlowHook: unknown;
      const client = {};
      const slow = {
        handleDisconnect: async () => {
          await pending;
          contextDuringSlowHook = client[REQUEST_CONTEXT_ID as any];
        },
      };
      vi.spyOn(container, 'registerRequestProvider').mockImplementation(
        () => undefined,
      );
      vi.spyOn(injector, 'loadPerContext').mockImplementation(
        async (target: any) => target,
      );
      const wrapper = (gateway: any) =>
        ({
          instance: gateway,
          isDependencyTreeStatic: () => false,
          isDependencyTreeDurable: () => false,
        }) as any;
      const moduleRef = { providers: new Map() } as Module;
      const slowHandler = instance.createRequestScopedEventHandler(
        wrapper(slow),
        moduleRef,
        'moduleKey',
        'handleDisconnect',
        {},
      );
      const fastHandler = instance.createRequestScopedEventHandler(
        wrapper(fast),
        moduleRef,
        'moduleKey',
        'handleDisconnect',
        {},
      );
      const slowResult = slowHandler(client);
      const contextId = client[REQUEST_CONTEXT_ID as any];
      await fastHandler(client);
      expect(client[REQUEST_CONTEXT_ID as any]).toBe(contextId);
      release!();
      await slowResult;
      expect(contextDuringSlowHook).toBe(contextId);
      expect(client[REQUEST_CONTEXT_ID as any]).toBeUndefined();
    });

    it('should preserve a newer context when an old disconnect hook completes', async () => {
      let release: () => void;
      const pending = new Promise<void>(resolve => {
        release = resolve;
      });
      const gateway = { handleDisconnect: async () => pending };
      vi.spyOn(container, 'registerRequestProvider').mockImplementation(
        () => undefined,
      );
      vi.spyOn(injector, 'loadPerContext').mockResolvedValue(gateway as never);
      const wrapper = {
        instance: gateway,
        isDependencyTreeStatic: () => false,
        isDependencyTreeDurable: () => false,
      } as any;
      const handler = instance.createRequestScopedEventHandler(
        wrapper,
        { providers: new Map() } as Module,
        'moduleKey',
        'handleDisconnect',
        {},
      );
      const client = {};
      const result = handler(client);
      Reflect.deleteProperty(client, REQUEST_CONTEXT_ID);
      const newContext = instance.getContextId(client, false);
      release!();
      await result;
      expect(client[REQUEST_CONTEXT_ID as any]).toBe(newContext);
    });

    it('should cleanup request-scoped context on disconnect', async () => {
      const client = {};
      const gatewayWrapper = {
        id: 'gateway-wrapper',
        token: Symbol('gateway-wrapper'),
        isDependencyTreeStatic: () => false,
        instance: {
          handleDisconnect() {},
        },
        isDependencyTreeDurable: () => false,
      } as any;
      const moduleRef = {
        providers: new Map([[gatewayWrapper.token, gatewayWrapper]]),
      } as Module;
      const contextInstance = {
        handleDisconnect: vi.fn(),
      };

      vi.spyOn(container, 'registerRequestProvider').mockImplementation(
        () => undefined,
      );
      const loadPerContext = vi
        .spyOn(injector, 'loadPerContext')
        .mockResolvedValue(contextInstance as never);

      const handler = instance.createRequestScopedEventHandler(
        gatewayWrapper,
        moduleRef,
        'moduleKey',
        'handleDisconnect',
        {},
      );

      await handler(client, 'test reason');

      const contextId = loadPerContext.mock.calls[0][3];
      expect(contextInstance.handleDisconnect).toHaveBeenCalledWith(
        client,
        'test reason',
      );
      expect(contextId).toBeDefined();
      expect(client[REQUEST_CONTEXT_ID as any]).toBeUndefined();
    });

    it('should cleanup request-scoped context after async handleDisconnect completes', async () => {
      const client = {};
      const gatewayWrapper = {
        id: 'gateway-wrapper',
        isDependencyTreeStatic: () => false,
        instance: {
          handleDisconnect() {},
        },
        isDependencyTreeDurable: () => false,
      } as any;
      const moduleRef = {
        providers: new Map(),
      } as Module;
      let contextIdDuringHook: unknown;

      vi.spyOn(container, 'registerRequestProvider').mockImplementation(
        () => undefined,
      );
      vi.spyOn(injector, 'loadPerContext').mockResolvedValue({
        handleDisconnect: async () => {
          await Promise.resolve();
          contextIdDuringHook = client[REQUEST_CONTEXT_ID as any];
        },
      } as never);

      const handler = instance.createRequestScopedEventHandler(
        gatewayWrapper,
        moduleRef,
        'moduleKey',
        'handleDisconnect',
        {},
      );

      await handler(client);

      expect(contextIdDuringHook).toBeDefined();
      expect(client[REQUEST_CONTEXT_ID as any]).toBeUndefined();
    });

    it('should pass async hook errors to the exception filter', async () => {
      const client = {};
      const error = new Error('Unauthorized');
      const gatewayWrapper = {
        id: 'gateway-wrapper',
        isDependencyTreeStatic: () => false,
        instance: {
          handleConnection() {},
        },
        isDependencyTreeDurable: () => false,
      } as any;
      const moduleRef = {
        providers: new Map(),
      } as Module;
      const exceptionFilter = { handle: vi.fn() };

      vi.spyOn(container, 'registerRequestProvider').mockImplementation(
        () => undefined,
      );
      vi.spyOn(injector, 'loadPerContext').mockResolvedValue({
        handleConnection: () => Promise.reject(error),
      } as never);
      vi.spyOn(exceptionFiltersContext, 'create').mockReturnValue(
        exceptionFilter as any,
      );

      const handler = instance.createRequestScopedEventHandler(
        gatewayWrapper,
        moduleRef,
        'moduleKey',
        'handleConnection',
        {},
      );

      await handler(client);

      expect(exceptionFilter.handle).toHaveBeenCalledWith(
        error,
        expect.anything(),
      );
    });

    it('should pass the client and the hook name to the exception filter', async () => {
      const client = {};
      const upgradeRequest = { url: '/' };
      const gatewayWrapper = {
        id: 'gateway-wrapper',
        isDependencyTreeStatic: () => false,
        instance: {
          handleConnection() {},
        },
        isDependencyTreeDurable: () => false,
      } as any;
      const moduleRef = {
        providers: new Map(),
      } as Module;
      const exceptionFilter = { handle: vi.fn() };

      vi.spyOn(container, 'registerRequestProvider').mockImplementation(
        () => undefined,
      );
      vi.spyOn(injector, 'loadPerContext').mockResolvedValue({
        handleConnection: () => {
          throw new Error('Unauthorized');
        },
      } as never);
      vi.spyOn(exceptionFiltersContext, 'create').mockReturnValue(
        exceptionFilter as any,
      );

      const handler = instance.createRequestScopedEventHandler(
        gatewayWrapper,
        moduleRef,
        'moduleKey',
        'handleConnection',
        {},
      );

      await handler(client, upgradeRequest);

      const host = exceptionFilter.handle.mock.calls[0][1];
      expect(host.getArgs()).toEqual([client, undefined, 'handleConnection']);
      expect(host.switchToWs().getClient()).toBe(client);
      expect(host.switchToWs().getData()).toBeUndefined();
      expect(host.switchToWs().getPattern()).toBe('handleConnection');
    });

    it('should pass the disconnect reason and the hook name to the exception filter', async () => {
      const client = {};
      const gatewayWrapper = {
        id: 'gateway-wrapper',
        isDependencyTreeStatic: () => false,
        instance: {
          handleDisconnect() {},
        },
        isDependencyTreeDurable: () => false,
      } as any;
      const exceptionFilter = { handle: vi.fn() };

      vi.spyOn(container, 'registerRequestProvider').mockImplementation(
        () => undefined,
      );
      vi.spyOn(injector, 'loadPerContext').mockResolvedValue({
        handleDisconnect: () => {
          throw new Error('cleanup failed');
        },
      } as never);
      vi.spyOn(exceptionFiltersContext, 'create').mockReturnValue(
        exceptionFilter as any,
      );

      await instance.createRequestScopedEventHandler(
        gatewayWrapper,
        { providers: new Map() } as Module,
        'moduleKey',
        'handleDisconnect',
        {},
      )(client, 'transport close');

      const host = exceptionFilter.handle.mock.calls[0][1];
      expect(host.getArgs()).toEqual([
        client,
        'transport close',
        'handleDisconnect',
      ]);
    });
  });
  describe('createStaticEventHandler', () => {
    let exceptionFilter: { handle: ReturnType<typeof vi.fn> };

    beforeEach(() => {
      exceptionFilter = { handle: vi.fn() };
      vi.spyOn(exceptionFiltersContext, 'create').mockReturnValue(
        exceptionFilter as any,
      );
    });

    it('should return undefined when the gateway does not implement the hook', () => {
      expect(
        instance.createStaticEventHandler({}, 'moduleKey', 'handleConnection'),
      ).toBeUndefined();
    });

    it('should run the hook synchronously on the gateway', () => {
      const gateway = { handleConnection: vi.fn() };
      const client = {};

      instance.createStaticEventHandler(
        gateway,
        'moduleKey',
        'handleConnection',
      )!(client, 'upgrade-request');

      expect(gateway.handleConnection).toHaveBeenCalledWith(
        client,
        'upgrade-request',
      );
      expect(gateway.handleConnection.mock.contexts[0]).toBe(gateway);
      expect(exceptionFilter.handle).not.toHaveBeenCalled();
    });

    it('should pass an error thrown by the hook to the exception filter', () => {
      const error = new Error('Unauthorized');
      const gateway = {
        handleConnection: () => {
          throw error;
        },
      };
      const client = {};

      instance.createStaticEventHandler(
        gateway,
        'moduleKey',
        'handleConnection',
      )!(client, { url: '/' });

      expect(exceptionFilter.handle).toHaveBeenCalledOnce();
      const [handledError, host] = exceptionFilter.handle.mock.calls[0];
      expect(handledError).toBe(error);
      expect(host.getType()).toBe('ws');
      expect(host.getArgs()).toEqual([client, undefined, 'handleConnection']);
    });

    it('should pass a rejection of an async hook to the exception filter', async () => {
      const error = new Error('Unauthorized');
      const gateway = { handleConnection: async () => Promise.reject(error) };
      const client = {};

      await instance.createStaticEventHandler(
        gateway,
        'moduleKey',
        'handleConnection',
      )!(client);

      expect(exceptionFilter.handle).toHaveBeenCalledOnce();
      expect(exceptionFilter.handle.mock.calls[0][0]).toBe(error);
      expect(
        exceptionFilter.handle.mock.calls[0][1].switchToWs().getPattern(),
      ).toBe('handleConnection');
    });

    it('should pass the disconnect reason as data for the disconnect hook', () => {
      const gateway = {
        handleDisconnect: () => {
          throw new Error('cleanup failed');
        },
      };
      const client = {};

      instance.createStaticEventHandler(
        gateway,
        'moduleKey',
        'handleDisconnect',
      )!(client, 'transport close');

      const host = exceptionFilter.handle.mock.calls[0][1];
      expect(host.switchToWs().getClient()).toBe(client);
      expect(host.switchToWs().getData()).toBe('transport close');
      expect(host.switchToWs().getPattern()).toBe('handleDisconnect');
    });
  });
  describe('getConnectionHandler', () => {
    const gateway = new Test();

    let handlers, fn;
    let connection,
      client,
      nextSpy: ReturnType<typeof vi.fn>,
      onSpy: ReturnType<typeof vi.fn>,
      subscribeMessages: ReturnType<typeof vi.fn>,
      subscribeDisconnectEvent: ReturnType<typeof vi.fn>,
      subscribeConnectionEvent: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      nextSpy = vi.fn();
      onSpy = vi.fn();
      subscribeMessages = vi.fn();
      subscribeDisconnectEvent = vi.fn();
      subscribeConnectionEvent = vi.fn();

      handlers = ['test'];
      connection = {
        next: nextSpy,
      };
      client = {
        on: onSpy,
      };
      untypedInstance.subscribeDisconnectEvent = subscribeDisconnectEvent;
      untypedInstance.subscribeConnectionEvent = subscribeConnectionEvent;
      untypedInstance.subscribeMessages = subscribeMessages;

      fn = instance.getConnectionHandler(
        instance,
        gateway,
        handlers,
        null!,
        connection,
      );
      fn(client);
    });

    it('should return function', () => {
      expect(
        instance.getConnectionHandler(null!, null!, null!, null!, null!),
      ).toBeTypeOf('function');
    });
    it('should call "next" method of connection object with expected argument', () => {
      expect(nextSpy).toHaveBeenCalledWith([client]);
    });
    it('should call "subscribeMessages" with expected arguments', () => {
      expect(subscribeMessages).toHaveBeenCalledWith(handlers, client, gateway);
    });
    it('should call "on" method of client object with expected arguments', () => {
      expect(onSpy).toHaveBeenCalled();
    });
  });
  describe('subscribeInitEvent', () => {
    const gateway = new Test();
    let event: any, subscribe: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      subscribe = vi.fn();
      event = { subscribe, pipe: vi.fn().mockReturnThis() };
    });
    it('should not call subscribe method when "afterInit" method not exists', () => {
      instance.subscribeInitEvent(gateway, event);
      expect(subscribe).not.toHaveBeenCalled();
    });
    it('should call subscribe method of event object with expected arguments when "afterInit" exists', () => {
      (gateway as any).afterInit = () => {};
      instance.subscribeInitEvent(gateway, event);
      expect(subscribe).toHaveBeenCalled();
    });
  });
  describe('subscribeConnectionEvent', () => {
    const gateway = new Test();
    let event, subscribe: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      subscribe = vi.fn();
      event = { subscribe, pipe: vi.fn().mockReturnThis() };
    });
    it('should not call subscribe method when "handleConnection" method not exists', () => {
      instance.subscribeConnectionEvent(gateway, event);
      expect(subscribe).not.toHaveBeenCalled();
    });
    it('should call subscribe method of event object with expected arguments when "handleConnection" exists', () => {
      (gateway as any).handleConnection = () => {};
      instance.subscribeConnectionEvent(gateway, event);
      expect(subscribe).toHaveBeenCalled();
    });
  });
  describe('subscribeDisconnectEvent', () => {
    const gateway = new Test();
    let event, subscribe: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      subscribe = vi.fn();
      event = { subscribe, pipe: vi.fn().mockReturnThis() };
    });
    it('should not call subscribe method when "handleDisconnect" method not exists', () => {
      instance.subscribeDisconnectEvent(gateway, event);
      expect(subscribe).not.toHaveBeenCalled();
    });
    it('should call subscribe method of event object with expected arguments when "handleDisconnect" exists', () => {
      (gateway as any).handleDisconnect = () => {};
      instance.subscribeDisconnectEvent(gateway, event);
      expect(subscribe).toHaveBeenCalled();
    });

    describe('when handling disconnect events', () => {
      let handleDisconnectSpy: ReturnType<typeof vi.fn>;

      beforeEach(() => {
        handleDisconnectSpy = vi.fn();
        (gateway as any).handleDisconnect = handleDisconnectSpy;
      });

      it('should call handleDisconnect with client and reason when data contains both', () => {
        const mockClient = { id: 'test-client' };
        const mockReason = 'client namespace disconnect';
        const disconnectData = { client: mockClient, reason: mockReason };

        let subscriptionCallback: Function | undefined;
        event.subscribe = (callback: Function) => {
          subscriptionCallback = callback;
        };

        instance.subscribeDisconnectEvent(gateway, event);

        if (subscriptionCallback) {
          subscriptionCallback(disconnectData);
        }

        expect(handleDisconnectSpy).toHaveBeenCalledOnce();
        expect(handleDisconnectSpy).toHaveBeenCalledWith(
          mockClient,
          mockReason,
        );
      });

      it('should call handleDisconnect with only client for backward compatibility', () => {
        const mockClient = { id: 'test-client' };

        let subscriptionCallback: Function | undefined;
        event.subscribe = (callback: Function) => {
          subscriptionCallback = callback;
        };

        instance.subscribeDisconnectEvent(gateway, event);

        if (subscriptionCallback) {
          subscriptionCallback(mockClient);
        }

        expect(handleDisconnectSpy).toHaveBeenCalledOnce();
        expect(handleDisconnectSpy).toHaveBeenCalledWith(mockClient);
      });

      it('should handle null/undefined data gracefully', () => {
        let subscriptionCallback: Function | undefined;
        event.subscribe = (callback: Function) => {
          subscriptionCallback = callback;
        };

        instance.subscribeDisconnectEvent(gateway, event);

        if (subscriptionCallback) {
          subscriptionCallback(null);
        }

        expect(handleDisconnectSpy).toHaveBeenCalledOnce();
        expect(handleDisconnectSpy).toHaveBeenCalledWith(null);
      });
    });
  });
  describe('subscribeMessages', () => {
    const gateway = new Test();

    let client, handlers, onSpy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      onSpy = vi.fn();
      client = { on: onSpy, off: onSpy };

      handlers = [
        {
          message: 'test',
          callback: { bind: () => 'testCallback' },
          isAckHandledManually: true,
        },
        {
          message: 'test2',
          callback: { bind: () => 'testCallback2' },
          isAckHandledManually: false,
        },
      ];
    });
    it('should bind each handler to client', () => {
      instance.subscribeMessages(handlers, client, gateway);
      expect(onSpy).toHaveBeenCalledTimes(2);
    });
    it('should pass "isAckHandledManually" flag to the adapter', () => {
      const adapter = config.getIoAdapter();
      const bindMessageHandlersSpy = vi.spyOn(adapter, 'bindMessageHandlers');

      instance.subscribeMessages(handlers, client, gateway);

      const handlersPassedToAdapter = bindMessageHandlersSpy.mock.calls[0][1];

      expect(handlersPassedToAdapter[0].message).toBe(handlers[0].message);
      expect(handlersPassedToAdapter[0].isAckHandledManually).toBe(
        handlers[0].isAckHandledManually,
      );

      expect(handlersPassedToAdapter[1].message).toBe(handlers[1].message);
      expect(handlersPassedToAdapter[1].isAckHandledManually).toBe(
        handlers[1].isAckHandledManually,
      );
    });
  });
  describe('pickResult', () => {
    describe('when deferredResult contains value which', () => {
      describe('is a Promise', () => {
        it('should return Promise<Observable>', async () => {
          const value = 100;
          expect(
            await lastValueFrom(
              await instance.pickResult(
                Promise.resolve(Promise.resolve(value)),
              ),
            ),
          ).toBe(value);
        });
      });

      describe('is an Observable', () => {
        it('should return Promise<Observable>', async () => {
          const value = 100;
          expect(
            await lastValueFrom(
              await instance.pickResult(Promise.resolve(of(value))),
            ),
          ).toBe(value);
        });
      });

      describe('is an object that has the method `subscribe`', () => {
        it('should return Promise<Observable>', async () => {
          const value = { subscribe() {} };
          expect(
            await lastValueFrom(
              await instance.pickResult(Promise.resolve(value)),
            ),
          ).toBe(value);
        });
      });

      describe('is an ordinary value', () => {
        it('should return Promise<Observable>', async () => {
          const value = 100;
          expect(
            await lastValueFrom(
              await instance.pickResult(Promise.resolve(value)),
            ),
          ).toBe(value);
        });
      });
    });
  });

  describe('connectGatewayToServer', () => {
    it('should use port 0 when PORT_METADATA is not defined', () => {
      const subscribeToServerEvents = vi.fn();
      untypedInstance.subscribeToServerEvents = subscribeToServerEvents;

      @WebSocketGateway()
      class EmptyGateway {}
      const gateway = new EmptyGateway();

      instance.connectGatewayToServer(gateway, EmptyGateway, 'mod', 'wrId');
      expect(subscribeToServerEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          instance: gateway,
          metatype: EmptyGateway,
          id: 'wrId',
        }),
        {},
        0,
        'mod',
        'wrId',
      );
    });
  });

  describe('subscribeToServerEvents', () => {
    it('should return early when appOptions.preview is true', () => {
      const previewConfig = new ApplicationConfig(new NoopAdapter());
      const previewProvider = new SocketServerProvider(null!, previewConfig);
      const contextCreator = {
        ...Object.fromEntries(
          Object.getOwnPropertyNames(WsContextCreator.prototype).map(m => [
            m,
            vi.fn(),
          ]),
        ),
      } as any;
      contextCreator.create.mockReturnValue(() => Promise.resolve());

      const previewInstance = new WebSocketsController(
        previewProvider,
        previewConfig,
        contextCreator,
        container,
        injector,
        exceptionFiltersContext,
        graphInspector,
        { preview: true },
      );

      const scanSpy = vi.spyOn(previewProvider, 'scanForSocketServer');
      const gateway = new Test();

      previewInstance.subscribeToServerEvents(
        {
          instance: gateway,
          metatype: Test,
          id: 'wrapperId',
          isDependencyTreeStatic: () => true,
          isDependencyTreeDurable: () => false,
        } as any,
        { namespace: '/' },
        90,
        'moduleKey',
        'wrapperId',
      );

      expect(scanSpy).not.toHaveBeenCalled();
    });
  });

  describe('printSubscriptionLogs', () => {
    it('should not throw when gateway has no constructor name', () => {
      const noNameGateway = Object.create(null);
      expect(() =>
        untypedInstance.printSubscriptionLogs(noNameGateway, []),
      ).not.toThrow();
    });

    it('should log each message handler', () => {
      const logSpy = vi.spyOn(untypedInstance.logger, 'log');
      const gateway = new Test();
      const handlers = [
        {
          message: 'msg1',
          methodName: 'a',
          callback: vi.fn(),
          isAckHandledManually: false,
        },
        {
          message: 'msg2',
          methodName: 'b',
          callback: vi.fn(),
          isAckHandledManually: false,
        },
      ];
      untypedInstance.printSubscriptionLogs(gateway, handlers);
      expect(logSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('inspectEntrypointDefinitions', () => {
    it('should not throw with empty message handlers', () => {
      expect(() =>
        instance.inspectEntrypointDefinitions(
          new Test() as any,
          80,
          [],
          'wrapperId',
        ),
      ).not.toThrow();
    });
  });
});
