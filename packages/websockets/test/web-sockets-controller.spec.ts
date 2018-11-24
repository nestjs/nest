import { ApplicationConfig } from '@nestjs/core/application-config';
import { expect } from 'chai';
import { of } from 'rxjs';
import * as sinon from 'sinon';
import { MetadataScanner } from '../../core/metadata-scanner';
import { PORT_METADATA } from '../constants';
import { WsContextCreator } from '../context/ws-context-creator';
import { InvalidSocketPortException } from '../errors/invalid-socket-port.exception';
import { GatewayMetadataExplorer } from '../gateway-metadata-explorer';
import { IoAdapter } from '../index';
import { SocketServerProvider } from '../socket-server-provider';
import { WebSocketGateway } from '../utils/socket-gateway.decorator';
import { WebSocketsController } from '../web-sockets-controller';

describe('WebSocketsController', () => {
  let instance: WebSocketsController;
  let provider: SocketServerProvider,
    config: ApplicationConfig,
    mockProvider: sinon.SinonMock;

  const port = 90,
    namespace = '/';
  @WebSocketGateway(port, { namespace })
  class Test {}

  beforeEach(() => {
    config = new ApplicationConfig(new IoAdapter());
    provider = new SocketServerProvider(null, config);
    mockProvider = sinon.mock(provider);
    instance = new WebSocketsController(
      provider,
      config,
      sinon.createStubInstance(WsContextCreator),
    );
  });
  describe('hookGatewayIntoServer', () => {
    let subscribeObservableServer: sinon.SinonSpy;

    @WebSocketGateway('test')
    class InvalidGateway {}

    @WebSocketGateway()
    class DefaultGateway {}

    beforeEach(() => {
      subscribeObservableServer = sinon.spy();
      (instance as any).subscribeObservableServer = subscribeObservableServer;
    });
    it('should throws "InvalidSocketPortException" when port is not a number', () => {
      Reflect.defineMetadata(PORT_METADATA, 'test', InvalidGateway);
      expect(() =>
        instance.hookGatewayIntoServer(
          new InvalidGateway(),
          InvalidGateway,
          '',
        ),
      ).throws(InvalidSocketPortException);
    });
    it('should call "subscribeObservableServer" with default values when metadata is empty', () => {
      const gateway = new DefaultGateway();
      instance.hookGatewayIntoServer(gateway, DefaultGateway, '');
      expect(subscribeObservableServer.calledWith(gateway, {}, 0, '')).to.be
        .true;
    });
    it('should call "subscribeObservableServer" when metadata is valid', () => {
      const gateway = new Test();
      instance.hookGatewayIntoServer(gateway, Test, '');
      expect(
        subscribeObservableServer.calledWith(gateway, { namespace }, port, ''),
      ).to.be.true;
    });
  });
  describe('subscribeObservableServer', () => {
    let explorer: GatewayMetadataExplorer,
      mockExplorer: sinon.SinonMock,
      gateway,
      handlers,
      server,
      hookServerToProperties: sinon.SinonSpy,
      subscribeEvents: sinon.SinonSpy;

    beforeEach(() => {
      gateway = new Test();
      explorer = new GatewayMetadataExplorer(new MetadataScanner());
      mockExplorer = sinon.mock(explorer);
      (instance as any).metadataExplorer = explorer;

      handlers = ['test'];
      server = { server: 'test' };

      mockExplorer.expects('explore').returns(handlers);
      mockProvider.expects('scanForSocketServer').returns(server);

      hookServerToProperties = sinon.spy();
      subscribeEvents = sinon.spy();

      (instance as any).hookServerToProperties = hookServerToProperties;
      (instance as any).subscribeEvents = subscribeEvents;

      sinon.stub(instance, 'injectMiddleware').returns(0);
    });
    it('should call "hookServerToProperties" with expected arguments', () => {
      instance.subscribeObservableServer(gateway, namespace, port, '');
      expect(hookServerToProperties.calledWith(gateway, server.server));
    });
    it('should call "subscribeEvents" with expected arguments', () => {
      instance.subscribeObservableServer(gateway, namespace, port, '');
      expect(subscribeEvents.calledWith(gateway, handlers, server));
    });
  });
  describe('subscribeEvents', () => {
    const gateway = new Test();

    let handlers;
    let server,
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

      (instance as any).subscribeInitEvent = subscribeInitEvent;
      (instance as any).getConnectionHandler = getConnectionHandler;
      (instance as any).subscribeConnectionEvent = subscribeConnectionEvent;
      (instance as any).subscribeDisconnectEvent = subscribeDisconnectEvent;
    });

    it('should call "subscribeConnectionEvent" with expected arguments', () => {
      instance.subscribeEvents(gateway, handlers, server as any);
      expect(subscribeConnectionEvent.calledWith(gateway, server.connection)).to
        .be.true;
    });
    it('should call "subscribeDisconnectEvent" with expected arguments', () => {
      instance.subscribeEvents(gateway, handlers, server as any);
      expect(subscribeDisconnectEvent.calledWith(gateway, server.disconnect)).to
        .be.true;
    });
    it('should call "subscribeInitEvent" with expected arguments', () => {
      instance.subscribeEvents(gateway, handlers, server as any);
      expect(subscribeInitEvent.calledWith(gateway, server.init)).to.be.true;
    });
    it('should bind connection handler to server', () => {
      instance.subscribeEvents(gateway, handlers, server as any);
      expect(onSpy.calledWith('connection', getConnectionHandler())).to.be.true;
    });
    it('should call "getConnectionHandler" with expected arguments', () => {
      instance.subscribeEvents(gateway, handlers, server as any);
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
      (instance as any).subscribeDisconnectEvent = subscribeDisconnectEvent;
      (instance as any).subscribeConnectionEvent = subscribeConnectionEvent;
      (instance as any).subscribeMessages = subscribeMessages;

      fn = instance.getConnectionHandler(
        instance,
        gateway,
        handlers,
        null,
        connection,
      );
      fn(client);
    });

    it('should returns function', () => {
      expect(
        instance.getConnectionHandler(null, null, null, null, null),
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
    let event, subscribe: sinon.SinonSpy;

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
      expect(onSpy.calledThrice).to.be.true;
    });
  });
  describe('pickResult', () => {
    describe('when defferedResult contains value which', () => {
      describe('is a Promise', () => {
        it('should returns Promise<Observable>', async () => {
          const value = 100;
          expect(
            await (await instance.pickResult(
              Promise.resolve(Promise.resolve(value)),
            )).toPromise(),
          ).to.be.eq(100);
        });
      });

      describe('is an Observable', () => {
        it('should returns Promise<Observable>', async () => {
          const value = 100;
          expect(
            await (await instance.pickResult(
              Promise.resolve(of(value)),
            )).toPromise(),
          ).to.be.eq(100);
        });
      });

      describe('is a value', () => {
        it('should returns Promise<Observable>', async () => {
          const value = 100;
          expect(
            await (await instance.pickResult(
              Promise.resolve(value),
            )).toPromise(),
          ).to.be.eq(100);
        });
      });
    });
  });
});
