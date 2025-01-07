import { NestContainer } from '@nestjs/core';
import { ApplicationConfig } from '@nestjs/core/application-config';
import { expect } from 'chai';
import { fromEvent, lastValueFrom, Observable, of } from 'rxjs';
import * as sinon from 'sinon';
import { GraphInspector } from '../../core/inspector/graph-inspector';
import { MetadataScanner } from '../../core/metadata-scanner';
import { AbstractWsAdapter } from '../adapters/ws-adapter';
import { PORT_METADATA } from '../constants';
import { WsContextCreator } from '../context/ws-context-creator';
import { WebSocketGateway } from '../decorators/socket-gateway.decorator';
import { InvalidSocketPortException } from '../errors/invalid-socket-port.exception';
import {
  GatewayMetadataExplorer,
  MessageMappingProperties,
} from '../gateway-metadata-explorer';
import { SocketServerProvider } from '../socket-server-provider';
import { WebSocketsController } from '../web-sockets-controller';

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
    mockProvider: sinon.SinonMock;

  const messageHandlerCallback = () => Promise.resolve();
  const port = 90,
    namespace = '/';
  @WebSocketGateway(port, { namespace })
  class Test {}

  beforeEach(() => {
    config = new ApplicationConfig(new NoopAdapter());
    provider = new SocketServerProvider(null!, config);
    graphInspector = new GraphInspector(new NestContainer());
    mockProvider = sinon.mock(provider);

    const contextCreator = sinon.createStubInstance(WsContextCreator);
    contextCreator.create.returns(messageHandlerCallback);
    instance = new WebSocketsController(
      provider,
      config,
      contextCreator as any,
      graphInspector,
    );
    untypedInstance = instance as any;
  });
  describe('connectGatewayToServer', () => {
    let subscribeToServerEvents: sinon.SinonSpy;

    @WebSocketGateway('test' as any)
    class InvalidGateway {}

    @WebSocketGateway()
    class DefaultGateway {}

    beforeEach(() => {
      subscribeToServerEvents = sinon.spy();
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
      ).throws(InvalidSocketPortException);
    });
    it('should call "subscribeToServerEvents" with default values when metadata is empty', () => {
      const gateway = new DefaultGateway();
      instance.connectGatewayToServer(
        gateway,
        DefaultGateway,
        'moduleKey',
        'instanceWrapperId',
      );
      expect(subscribeToServerEvents.calledWith(gateway, {}, 0, 'moduleKey')).to
        .be.true;
    });
    it('should call "subscribeToServerEvents" when metadata is valid', () => {
      const gateway = new Test();
      instance.connectGatewayToServer(
        gateway,
        Test,
        'moduleKey',
        'instanceWrapperId',
      );
      expect(
        subscribeToServerEvents.calledWith(
          gateway,
          { namespace },
          port,
          'moduleKey',
        ),
      ).to.be.true;
    });
  });
  describe('subscribeToServerEvents', () => {
    let explorer: GatewayMetadataExplorer,
      mockExplorer: sinon.SinonMock,
      gateway,
      handlers,
      server,
      assignServerToProperties: sinon.SinonSpy,
      subscribeEvents: sinon.SinonSpy;
    const handlerCallback = () => {};

    beforeEach(() => {
      gateway = new Test();
      explorer = new GatewayMetadataExplorer(new MetadataScanner());
      mockExplorer = sinon.mock(explorer);
      untypedInstance.metadataExplorer = explorer;

      handlers = [
        {
          message: 'message',
          methodName: 'methodName',
          callback: handlerCallback,
        },
      ];
      server = { server: 'test' };

      mockExplorer.expects('explore').returns(handlers);
      mockProvider.expects('scanForSocketServer').returns(server);

      assignServerToProperties = sinon.spy();
      subscribeEvents = sinon.spy();
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
      expect(assignServerToProperties.calledWith(gateway, server.server)).to.be
        .true;
    });
    it('should call "subscribeEvents" with expected arguments', () => {
      instance.subscribeToServerEvents(
        gateway,
        { namespace },
        port,
        'moduleKey',
        'instanceWrapperId',
      );
      expect(subscribeEvents.firstCall.args[0]).to.be.equal(gateway);
      expect(subscribeEvents.firstCall.args[2]).to.be.equal(server);
      expect(subscribeEvents.firstCall.args[1]).to.be.eql([
        {
          message: 'message',
          methodName: 'methodName',
          callback: messageHandlerCallback,
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
        },
        {
          methodName: 'create',
          message: 'insert',
          callback: null!,
        },
      ];
      const insertEntrypointDefinitionSpy = sinon.spy(
        graphInspector,
        'insertEntrypointDefinition',
      );
      instance.inspectEntrypointDefinitions(
        new GatewayHostCls(),
        port,
        messageHandlers,
        instanceWrapperId,
      );

      expect(insertEntrypointDefinitionSpy.calledTwice).to.be.true;
      expect(
        insertEntrypointDefinitionSpy.calledWith({
          type: 'websocket',
          methodName: messageHandlers[0].methodName,
          className: GatewayHostCls.name,
          classNodeId: instanceWrapperId,
          metadata: {
            port,
            key: messageHandlers[0].message,
            message: messageHandlers[0].message,
          } as any,
        }),
      ).to.be.true;
      expect(
        insertEntrypointDefinitionSpy.calledWith({
          type: 'websocket',
          methodName: messageHandlers[1].methodName,
          className: GatewayHostCls.name,
          classNodeId: instanceWrapperId,
          metadata: {
            port,
            key: messageHandlers[1].message,
            message: messageHandlers[1].message,
          } as any,
        }),
      ).to.be.true;
    });
  });
  describe('subscribeEvents', () => {
    const gateway = new Test();

    let handlers: any;
    let server: any,
      subscribeConnectionEvent: sinon.SinonSpy,
      subscribeDisconnectEvent: sinon.SinonSpy,
      nextSpy: sinon.SinonSpy,
      onSpy: sinon.SinonSpy,
      subscribeInitEvent: sinon.SinonSpy,
      getConnectionHandler: sinon.SinonSpy;

    beforeEach(() => {
      nextSpy = sinon.spy();
      onSpy = sinon.spy();
      subscribeInitEvent = sinon.spy();
      getConnectionHandler = sinon.spy();
      subscribeConnectionEvent = sinon.spy();
      subscribeDisconnectEvent = sinon.spy();

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
      expect(subscribeConnectionEvent.calledWith(gateway, server.connection)).to
        .be.true;
    });
    it('should call "subscribeDisconnectEvent" with expected arguments', () => {
      instance.subscribeEvents(gateway, handlers, server);
      expect(subscribeDisconnectEvent.calledWith(gateway, server.disconnect)).to
        .be.true;
    });
    it('should call "subscribeInitEvent" with expected arguments', () => {
      instance.subscribeEvents(gateway, handlers, server);
      expect(subscribeInitEvent.calledWith(gateway, server.init)).to.be.true;
    });
    it('should bind connection handler to server', () => {
      instance.subscribeEvents(gateway, handlers, server);
      expect(onSpy.calledWith('connection', getConnectionHandler())).to.be.true;
    });
    it('should call "getConnectionHandler" with expected arguments', () => {
      instance.subscribeEvents(gateway, handlers, server);
      expect(
        getConnectionHandler.calledWith(
          instance,
          gateway,
          handlers,
          server.disconnect,
          server.connection,
        ),
      ).to.be.true;
    });
  });
  describe('getConnectionHandler', () => {
    const gateway = new Test();

    let handlers, fn;
    let connection,
      client,
      nextSpy: sinon.SinonSpy,
      onSpy: sinon.SinonSpy,
      subscribeMessages: sinon.SinonSpy,
      subscribeDisconnectEvent: sinon.SinonSpy,
      subscribeConnectionEvent: sinon.SinonSpy;

    beforeEach(() => {
      nextSpy = sinon.spy();
      onSpy = sinon.spy();
      subscribeMessages = sinon.spy();
      subscribeDisconnectEvent = sinon.spy();
      subscribeConnectionEvent = sinon.spy();

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
      ).to.be.a('function');
    });
    it('should call "next" method of connection object with expected argument', () => {
      expect(nextSpy.calledWith([client])).to.be.true;
    });
    it('should call "subscribeMessages" with expected arguments', () => {
      expect(subscribeMessages.calledWith(handlers, client, gateway)).to.be
        .true;
    });
    it('should call "on" method of client object with expected arguments', () => {
      expect(onSpy.called).to.be.true;
    });
  });
  describe('subscribeInitEvent', () => {
    const gateway = new Test();
    let event: any, subscribe: sinon.SinonSpy;

    beforeEach(() => {
      subscribe = sinon.spy();
      event = { subscribe, pipe: sinon.stub().returnsThis() };
    });
    it('should not call subscribe method when "afterInit" method not exists', () => {
      instance.subscribeInitEvent(gateway, event);
      expect(subscribe.called).to.be.false;
    });
    it('should call subscribe method of event object with expected arguments when "afterInit" exists', () => {
      (gateway as any).afterInit = () => {};
      instance.subscribeInitEvent(gateway, event);
      expect(subscribe.called).to.be.true;
    });
  });
  describe('subscribeConnectionEvent', () => {
    const gateway = new Test();
    let event, subscribe: sinon.SinonSpy;

    beforeEach(() => {
      subscribe = sinon.spy();
      event = { subscribe, pipe: sinon.stub().returnsThis() };
    });
    it('should not call subscribe method when "handleConnection" method not exists', () => {
      instance.subscribeConnectionEvent(gateway, event);
      expect(subscribe.called).to.be.false;
    });
    it('should call subscribe method of event object with expected arguments when "handleConnection" exists', () => {
      (gateway as any).handleConnection = () => {};
      instance.subscribeConnectionEvent(gateway, event);
      expect(subscribe.called).to.be.true;
    });
  });
  describe('subscribeDisconnectEvent', () => {
    const gateway = new Test();
    let event, subscribe: sinon.SinonSpy;

    beforeEach(() => {
      subscribe = sinon.spy();
      event = { subscribe, pipe: sinon.stub().returnsThis() };
    });
    it('should not call subscribe method when "handleDisconnect" method not exists', () => {
      instance.subscribeDisconnectEvent(gateway, event);
      expect(subscribe.called).to.be.false;
    });
    it('should call subscribe method of event object with expected arguments when "handleDisconnect" exists', () => {
      (gateway as any).handleDisconnect = () => {};
      instance.subscribeDisconnectEvent(gateway, event);
      expect(subscribe.called).to.be.true;
    });
  });
  describe('subscribeMessages', () => {
    const gateway = new Test();

    let client, handlers, onSpy: sinon.SinonSpy;

    beforeEach(() => {
      onSpy = sinon.spy();
      client = { on: onSpy, off: onSpy };

      handlers = [
        { message: 'test', callback: { bind: () => 'testCallback' } },
        { message: 'test2', callback: { bind: () => 'testCallback2' } },
      ];
    });
    it('should bind each handler to client', () => {
      instance.subscribeMessages(handlers, client, gateway);
      expect(onSpy.calledTwice).to.be.true;
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
          ).to.be.eq(value);
        });
      });

      describe('is an Observable', () => {
        it('should return Promise<Observable>', async () => {
          const value = 100;
          expect(
            await lastValueFrom(
              await instance.pickResult(Promise.resolve(of(value))),
            ),
          ).to.be.eq(value);
        });
      });

      describe('is an object that has the method `subscribe`', () => {
        it('should return Promise<Observable>', async () => {
          const value = { subscribe() {} };
          expect(
            await lastValueFrom(
              await instance.pickResult(Promise.resolve(value)),
            ),
          ).to.equal(value);
        });
      });

      describe('is an ordinary value', () => {
        it('should return Promise<Observable>', async () => {
          const value = 100;
          expect(
            await lastValueFrom(
              await instance.pickResult(Promise.resolve(value)),
            ),
          ).to.be.eq(value);
        });
      });
    });
  });
});
