import { NestContainer } from '@nestjs/core';
import { ApplicationConfig } from '@nestjs/core/application-config.js';
import { fromEvent, lastValueFrom, Observable, of } from 'rxjs';
import { GraphInspector } from '../../core/inspector/graph-inspector.js';
import { MetadataScanner } from '../../core/metadata-scanner.js';
import { AbstractWsAdapter } from '../adapters/ws-adapter.js';
import { PORT_METADATA } from '../constants.js';
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
    config: ApplicationConfig;

  const messageHandlerCallback = () => Promise.resolve();
  const port = 90,
    namespace = '/';
  @WebSocketGateway(port, { namespace })
  class Test {}

  beforeEach(() => {
    config = new ApplicationConfig(new NoopAdapter());
    provider = new SocketServerProvider(null!, config);
    graphInspector = new GraphInspector(new NestContainer());

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
      contextCreator as any,
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
          new InvalidGateway(),
          InvalidGateway,
          'moduleKey',
          'instanceWrapperId',
        ),
      ).toThrow(InvalidSocketPortException);
    });
    it('should call "subscribeToServerEvents" with default values when metadata is empty', () => {
      const gateway = new DefaultGateway();
      instance.connectGatewayToServer(
        gateway,
        DefaultGateway,
        'moduleKey',
        'instanceWrapperId',
      );
      expect(subscribeToServerEvents).toHaveBeenCalledWith(
        gateway,
        {},
        0,
        'moduleKey',
        'instanceWrapperId',
      );
    });
    it('should call "subscribeToServerEvents" when metadata is valid', () => {
      const gateway = new Test();
      instance.connectGatewayToServer(
        gateway,
        Test,
        'moduleKey',
        'instanceWrapperId',
      );
      expect(subscribeToServerEvents).toHaveBeenCalledWith(
        gateway,
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
      vi.spyOn(provider, 'scanForSocketServer').mockReturnValue(server as any);

      assignServerToProperties = vi.fn();
      subscribeEvents = vi.fn();
      instance['assignServerToProperties'] = assignServerToProperties;
      instance['subscribeEvents'] = subscribeEvents;
    });
    it('should call "assignServerToProperties" with expected arguments', () => {
      instance.subscribeToServerEvents(
        gateway,
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
        gateway,
        { namespace },
        port,
        'moduleKey',
        'instanceWrapperId',
      );
      expect(subscribeEvents.mock.calls[0][0]).toBe(gateway);
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
      instance.subscribeEvents(gateway, handlers, server);
      expect(subscribeConnectionEvent).toHaveBeenCalledWith(
        gateway,
        server.connection,
      );
    });
    it('should call "subscribeDisconnectEvent" with expected arguments', () => {
      instance.subscribeEvents(gateway, handlers, server);
      expect(subscribeDisconnectEvent).toHaveBeenCalledWith(
        gateway,
        server.disconnect,
      );
    });
    it('should call "subscribeInitEvent" with expected arguments', () => {
      instance.subscribeEvents(gateway, handlers, server);
      expect(subscribeInitEvent).toHaveBeenCalledWith(gateway, server.init);
    });
    it('should bind connection handler to server', () => {
      instance.subscribeEvents(gateway, handlers, server);
      expect(onSpy).toHaveBeenCalledWith('connection', getConnectionHandler());
    });
    it('should call "getConnectionHandler" with expected arguments', () => {
      instance.subscribeEvents(gateway, handlers, server);
      expect(getConnectionHandler).toHaveBeenCalledWith(
        instance,
        gateway,
        handlers,
        server.disconnect,
        server.connection,
      );
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
});
