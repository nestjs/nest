import { expect } from 'chai';
import { Socket as NetSocket } from 'net';
import * as sinon from 'sinon';
import { TLSSocket } from 'tls';
import { ClientTCP } from '../../client/client-tcp';
import { TcpEventsMap } from '../../events/tcp.events';

describe('ClientTCP', () => {
  let client: ClientTCP;
  let untypedClient: any;
  let socket: any;
  let createSocketStub: sinon.SinonStub;

  beforeEach(() => {
    client = new ClientTCP({});
    untypedClient = client as any;

    const onFakeCallback = (event, callback) =>
      event !== 'error' && event !== 'close' && callback({});

    socket = {
      connect: sinon.stub(),
      on: sinon.stub().callsFake(onFakeCallback),
      netSocket: {
        addListener: sinon.stub().callsFake(onFakeCallback),
        removeListener: sinon.spy(),
        once: sinon.stub().callsFake(onFakeCallback),
      },
      sendMessage: sinon.spy(),
      end: sinon.spy(),
    };
    createSocketStub = sinon
      .stub(client, 'createSocket')
      .callsFake(() => socket);
  });
  afterEach(() => {
    createSocketStub.restore();
  });
  describe('publish', () => {
    let msg;
    beforeEach(() => {
      msg = { test: 3 };
      client['isConnected'] = true;
      client['socket'] = socket;
    });
    it('should send message', () => {
      client['publish'](msg, () => ({}));
    });
    describe('on dispose', () => {
      it('should remove listener from routing map', () => {
        client['publish'](msg, () => ({}))();

        expect(client['routingMap'].size).to.be.eq(0);
      });
    });
    describe('on error', () => {
      it('should call callback', () => {
        const callback = sinon.spy();
        sinon.stub(client, 'assignPacketId' as any).callsFake(() => {
          throw new Error();
        });
        client['publish'](msg, callback);
        expect(callback.called).to.be.true;
        expect(callback.getCall(0).args[0].err).to.be.instanceof(Error);
      });
    });
  });
  describe('handleResponse', () => {
    let callback: sinon.SinonSpy;
    const id = '1';

    describe('when disposed', () => {
      beforeEach(async () => {
        callback = sinon.spy();
        client['routingMap'].set(id, callback);
        await client.handleResponse({ id, isDisposed: true });
      });
      it('should emit disposed callback', () => {
        expect(callback.called).to.be.true;
        expect(
          callback.calledWith({
            err: undefined,
            response: undefined,
            isDisposed: true,
          }),
        ).to.be.true;
      });
    });
    describe('when not disposed', () => {
      let buffer;
      beforeEach(async () => {
        buffer = { id, err: undefined, response: 'res' };
        callback = sinon.spy();
        client['routingMap'].set(id, callback);
        await client.handleResponse(buffer);
      });
      it('should not end server', () => {
        expect(socket.end.called).to.be.false;
      });
      it('should call callback with error and response data', () => {
        expect(callback.called).to.be.true;
        expect(
          callback.calledWith({
            err: buffer.err,
            response: buffer.response,
          }),
        ).to.be.true;
      });
    });
  });
  describe('connect', () => {
    let registerConnectListenerSpy: sinon.SinonSpy;
    let registerErrorListenerSpy: sinon.SinonSpy;
    let registerCloseListenerSpy: sinon.SinonSpy;
    let connect$Stub: sinon.SinonStub;

    beforeEach(async () => {
      registerConnectListenerSpy = sinon.spy(client, 'registerConnectListener');
      registerErrorListenerSpy = sinon.spy(client, 'registerErrorListener');
      registerCloseListenerSpy = sinon.spy(client, 'registerCloseListener');
    });
    afterEach(() => {
      registerConnectListenerSpy.restore();
      registerErrorListenerSpy.restore();
      registerCloseListenerSpy.restore;
    });
    describe('when is not connected', () => {
      beforeEach(async () => {
        client['isConnected'] = false;
        const source = {
          subscribe: ({ complete }) => complete(),
          pipe: () => source,
        };
        connect$Stub = sinon
          .stub(client, 'connect$' as any)
          .callsFake(() => source);
        await client.connect();
      });
      afterEach(() => {
        connect$Stub.restore();
      });
      it('should call "registerConnectListener" once', async () => {
        expect(registerConnectListenerSpy.called).to.be.true;
      });
      it('should call "registerErrorListener" once', async () => {
        expect(registerErrorListenerSpy.called).to.be.true;
      });
      it('should call "registerCloseListener" once', async () => {
        expect(registerCloseListenerSpy.called).to.be.true;
      });
      it('should call "createSocket" once', async () => {
        expect(createSocketStub.called).to.be.true;
      });
      it('should call "connect$" once', async () => {
        expect(connect$Stub.called).to.be.true;
      });
      it('should listen on messages', () => {
        expect(socket.on.called).to.be.true;
      });
    });
    describe('when is connected', () => {
      beforeEach(() => {
        client['isConnected'] = true;
      });
      it('should not call "createSocket"', () => {
        expect(createSocketStub.called).to.be.false;
      });
      it('should not call "bindEvents"', () => {
        expect(registerConnectListenerSpy.called).to.be.false;
      });
    });
  });
  describe('close', () => {
    let routingMap: Map<string, Function>;
    let callback: sinon.SinonSpy;

    beforeEach(() => {
      routingMap = new Map<string, Function>();
      callback = sinon.spy();
      routingMap.set('some id', callback);

      untypedClient.socket = socket;
      untypedClient.routingMap = routingMap;
      client.close();
    });
    it('should end() socket', () => {
      expect(socket.end.called).to.be.true;
    });
    it('should set "socket" to null', () => {
      expect(untypedClient.socket).to.be.null;
    });
    it('should clear out the routing map', () => {
      expect(untypedClient.routingMap.size).to.be.eq(0);
    });
    it('should call callbacks', () => {
      expect(
        callback.calledWith({
          err: sinon.match({ message: 'Connection closed' }),
        }),
      ).to.be.true;
    });
  });
  describe('registerErrorListener', () => {
    it('should bind error event handler', () => {
      const callback = sinon.stub().callsFake((_, fn) => fn({ code: 'test' }));
      const emitter = {
        on: callback,
      };
      client.registerErrorListener(emitter as any);
      expect(callback.getCall(0).args[0]).to.be.eql(TcpEventsMap.ERROR);
    });
  });
  describe('registerCloseListener', () => {
    it('should bind close event handler', () => {
      const callback = sinon.stub().callsFake((_, fn) => fn({ code: 'test' }));
      const emitter = {
        on: callback,
      };
      client.registerCloseListener(emitter as any);
      expect(callback.getCall(0).args[0]).to.be.eql(TcpEventsMap.CLOSE);
    });
  });
  describe('registerConnectListener', () => {
    it('should bind connect event handler', () => {
      const callback = sinon.stub().callsFake((_, fn) => fn({ code: 'test' }));
      const emitter = {
        on: callback,
      };
      client.registerConnectListener(emitter as any);
      expect(callback.getCall(0).args[0]).to.be.eql(TcpEventsMap.CONNECT);
    });
  });
  describe('dispatchEvent', () => {
    const msg = { pattern: 'pattern', data: 'data' };
    let sendMessageStub: sinon.SinonStub, internalSocket;

    beforeEach(() => {
      sendMessageStub = sinon.stub();
      internalSocket = {
        sendMessage: sendMessageStub,
      };
      untypedClient.socket = internalSocket;
    });

    it('should publish packet', async () => {
      await client['dispatchEvent'](msg);

      expect(sendMessageStub.called).to.be.true;
    });
  });

  describe('tls', () => {
    it('should upgrade to TLS', () => {
      const client = new ClientTCP({ tlsOptions: {} });
      const jsonSocket = client.createSocket();
      expect(jsonSocket.socket).instanceOf(TLSSocket);
    });
    it('should not upgrade to TLS, if not requested', () => {
      const jsonSocket = new ClientTCP({}).createSocket();
      expect(jsonSocket.socket).instanceOf(NetSocket);
    });
  });
});
