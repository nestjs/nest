import { Socket as NetSocket } from 'net';
import { TLSSocket } from 'tls';
import { ClientTCP } from '../../client/client-tcp.js';
import { TcpSocket } from '../../helpers/tcp-socket.js';

describe('ClientTCP', () => {
  let client: ClientTCP;
  let untypedClient: any;
  let socket: any;
  let createSocketStub: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    client = new ClientTCP({});
    untypedClient = client as any;

    const onFakeCallback = (event, callback) =>
      event !== 'error' && event !== 'close' && callback({});

    socket = {
      connect: vi.fn(),
      on: vi.fn().mockImplementation(onFakeCallback),
      netSocket: {
        addListener: vi.fn().mockImplementation(onFakeCallback),
        removeListener: vi.fn(),
        once: vi.fn().mockImplementation(onFakeCallback),
      },
      sendMessage: vi.fn(),
      end: vi.fn(),
    };
    createSocketStub = vi
      .spyOn(client, 'createSocket')
      .mockImplementation(() => socket);
  });
  afterEach(() => {
    createSocketStub.mockRestore();
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

        expect(client['routingMap'].size).toBe(0);
      });
    });
    describe('on error', () => {
      it('should call callback', () => {
        const callback = vi.fn();
        vi.spyOn(client, 'assignPacketId' as any).mockImplementation(() => {
          throw new Error();
        });
        client['publish'](msg, callback);
        expect(callback).toHaveBeenCalled();
        expect(callback.mock.calls[0][0].err).toBeInstanceOf(Error);
      });
    });
  });
  describe('handleResponse', () => {
    let callback: ReturnType<typeof vi.fn>;
    const id = '1';

    describe('when disposed', () => {
      beforeEach(async () => {
        callback = vi.fn();
        client['routingMap'].set(id, callback);
        await client.handleResponse({ id, isDisposed: true });
      });
      it('should emit disposed callback', () => {
        expect(callback).toHaveBeenCalledWith({
          err: undefined,
          response: undefined,
          isDisposed: true,
        });
      });
    });
    describe('when not disposed', () => {
      let buffer;
      beforeEach(async () => {
        buffer = { id, err: undefined, response: 'res' };
        callback = vi.fn();
        client['routingMap'].set(id, callback);
        await client.handleResponse(buffer);
      });
      it('should not end server', () => {
        expect(socket.end).not.toHaveBeenCalled();
      });
      it('should call callback with error and response data', () => {
        expect(callback).toHaveBeenCalledWith({
          err: buffer.err,
          response: buffer.response,
        });
      });
    });
  });
  describe('connect', () => {
    let registerConnectListenerSpy: ReturnType<typeof vi.fn>;
    let registerErrorListenerSpy: ReturnType<typeof vi.fn>;
    let registerCloseListenerSpy: ReturnType<typeof vi.fn>;
    let connect$Stub: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
      registerConnectListenerSpy = vi.spyOn(client, 'registerConnectListener');
      registerErrorListenerSpy = vi.spyOn(client, 'registerErrorListener');
      registerCloseListenerSpy = vi.spyOn(client, 'registerCloseListener');
    });
    afterEach(() => {
      registerConnectListenerSpy.mockRestore();
      registerErrorListenerSpy.mockRestore();
      registerCloseListenerSpy.mockRestore();
    });
    describe('when is not connected', () => {
      beforeEach(async () => {
        client['isConnected'] = false;
        const source = {
          subscribe: ({ complete }) => complete(),
          pipe: () => source,
        };
        connect$Stub = vi
          .spyOn(client, 'connect$' as any)
          .mockImplementation(() => source);
        await client.connect();
      });
      afterEach(() => {
        connect$Stub.mockRestore();
      });
      it('should call "registerConnectListener" once', async () => {
        expect(registerConnectListenerSpy).toHaveBeenCalled();
      });
      it('should call "registerErrorListener" once', async () => {
        expect(registerErrorListenerSpy).toHaveBeenCalled();
      });
      it('should call "registerCloseListener" once', async () => {
        expect(registerCloseListenerSpy).toHaveBeenCalled();
      });
      it('should call "createSocket" once', async () => {
        expect(createSocketStub).toHaveBeenCalled();
      });
      it('should call "connect$" once', async () => {
        expect(connect$Stub).toHaveBeenCalled();
      });
      it('should listen on messages', () => {
        expect(socket.on).toHaveBeenCalled();
      });
    });
    describe('when is connected', () => {
      beforeEach(() => {
        client['isConnected'] = true;
      });
      it('should not call "createSocket"', () => {
        expect(createSocketStub).not.toHaveBeenCalled();
      });
      it('should not call "bindEvents"', () => {
        expect(registerConnectListenerSpy).not.toHaveBeenCalled();
      });
    });
  });
  describe('close', () => {
    let routingMap: Map<string, Function>;
    let callback: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      routingMap = new Map<string, Function>();
      callback = vi.fn();
      routingMap.set('some id', callback);

      untypedClient.socket = socket;
      untypedClient.routingMap = routingMap;
      client.close();
    });
    it('should end() socket', () => {
      expect(socket.end).toHaveBeenCalled();
    });
    it('should set "socket" to null', () => {
      expect(untypedClient.socket).toBeNull();
    });
    it('should clear out the routing map', () => {
      expect(untypedClient.routingMap.size).toBe(0);
    });
    it('should call callbacks', () => {
      expect(callback).toHaveBeenCalledWith({
        err: expect.objectContaining({ message: 'Connection closed' }),
      });
    });
  });
  describe('registerErrorListener', () => {
    it('should bind error event handler', () => {
      const callback = vi
        .fn()
        .mockImplementation((_, fn) => fn({ code: 'test' }));
      const emitter = {
        on: callback,
      };
      client.registerErrorListener(emitter as any);
      expect(callback.mock.calls[0][0]).toEqual('error');
    });
  });
  describe('registerCloseListener', () => {
    it('should bind close event handler', () => {
      const callback = vi
        .fn()
        .mockImplementation((_, fn) => fn({ code: 'test' }));
      const emitter = {
        on: callback,
      };
      client.registerCloseListener(emitter as any);
      expect(callback.mock.calls[0][0]).toEqual('close');
    });
  });
  describe('registerConnectListener', () => {
    it('should bind connect event handler', () => {
      const callback = vi
        .fn()
        .mockImplementation((_, fn) => fn({ code: 'test' }));
      const emitter = {
        on: callback,
      };
      client.registerConnectListener(emitter as any);
      expect(callback.mock.calls[0][0]).toEqual('connect');
    });
  });
  describe('dispatchEvent', () => {
    const msg = { pattern: 'pattern', data: 'data' };
    let sendMessageStub: ReturnType<typeof vi.fn>, internalSocket;

    beforeEach(() => {
      sendMessageStub = vi.fn();
      internalSocket = {
        sendMessage: sendMessageStub,
      };
      untypedClient.socket = internalSocket;
    });

    it('should publish packet', async () => {
      await client['dispatchEvent'](msg);

      expect(sendMessageStub).toHaveBeenCalled();
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

  describe('maxBufferSize', () => {
    const DEFAULT_MAX_BUFFER_SIZE = (512 * 1024 * 1024) / 4;

    describe('when maxBufferSize is not provided', () => {
      it('should use default maxBufferSize', () => {
        const client = new ClientTCP({});
        const socket = client.createSocket();
        expect(socket['maxBufferSize']).toBe(DEFAULT_MAX_BUFFER_SIZE);
      });
    });

    describe('when maxBufferSize is provided', () => {
      it('should use custom maxBufferSize', () => {
        const customSize = 5000;
        const client = new ClientTCP({ maxBufferSize: customSize });
        const socket = client.createSocket();
        expect(socket['maxBufferSize']).toBe(customSize);
      });

      it('should pass maxBufferSize to JsonSocket', () => {
        const customSize = 10000;
        const client = new ClientTCP({ maxBufferSize: customSize });
        const socket = client.createSocket();
        expect(socket['maxBufferSize']).toBe(customSize);
      });
    });

    describe('when custom socketClass is provided', () => {
      it('should not pass maxBufferSize to custom socket class', () => {
        class CustomSocket extends TcpSocket {
          constructor(socket: any) {
            super(socket);
          }
          protected handleSend() {}
          protected handleData() {}
        }

        const client = new ClientTCP({
          socketClass: CustomSocket as any,
          maxBufferSize: 5000,
        });
        const socket = client.createSocket();
        expect(socket).toBeInstanceOf(CustomSocket);
        // Custom socket should not have maxBufferSize property
        expect(socket['maxBufferSize']).toBeUndefined();
      });
    });
  });
});
