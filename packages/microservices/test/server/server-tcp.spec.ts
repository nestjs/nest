import { Socket as NetSocket } from 'net';
import { NO_MESSAGE_HANDLER } from '../../constants.js';
import { BaseRpcContext } from '../../ctx-host/base-rpc.context.js';
import { TcpSocket } from '../../helpers/tcp-socket.js';
import { ServerTCP } from '../../server/server-tcp.js';
import { objectToMap } from './utils/object-to-map.js';

describe('ServerTCP', () => {
  let server: ServerTCP;
  let untypedServer: any;

  beforeEach(() => {
    server = new ServerTCP({});
    untypedServer = server as any;
  });

  describe('bindHandler', () => {
    const socket = { on: vi.fn() };

    beforeEach(() => {
      vi.spyOn(server, 'getSocketInstance' as any).mockImplementation(
        () => socket,
      );
    });
    it('should bind message and error events to handler', () => {
      server.bindHandler(null!);
      expect(socket.on).toHaveBeenCalledTimes(2);
    });
  });
  describe('close', () => {
    const tcpServer = { close: vi.fn() };
    beforeEach(() => {
      untypedServer.server = tcpServer;
    });
    it('should close server', () => {
      server.close();
      expect(tcpServer.close).toHaveBeenCalled();
    });
  });
  describe('listen', () => {
    const serverMock = { listen: vi.fn(), once: vi.fn() };
    beforeEach(() => {
      untypedServer.server = serverMock;
    });
    it('should call native listen method with expected arguments', () => {
      const callback = () => {};
      server.listen(callback);
      expect(serverMock.listen).toHaveBeenCalledWith(
        untypedServer.port,
        untypedServer.host,
        callback,
      );
    });
  });
  describe('handleMessage', () => {
    let socket;
    const msg = {
      pattern: 'test',
      data: 'tests',
      id: '3',
    };
    beforeEach(() => {
      socket = {
        sendMessage: vi.fn(),
      };
    });
    it('should send NO_MESSAGE_HANDLER error if key does not exists in handlers object', async () => {
      await server.handleMessage(socket, msg);
      expect(socket.sendMessage).toHaveBeenCalledWith({
        id: msg.id,
        status: 'error',
        err: NO_MESSAGE_HANDLER,
      });
    });
    it('should call handler if exists in handlers object', async () => {
      const handler = vi.fn();
      untypedServer.messageHandlers = objectToMap({
        [msg.pattern]: handler as any,
      });
      await server.handleMessage(socket, msg);
      expect(handler).toHaveBeenCalledOnce();
    });
  });
  describe('handleClose', () => {
    describe('when is terminated', () => {
      it('should return undefined', () => {
        untypedServer.isExplicitlyTerminated = true;
        const result = server.handleClose();
        expect(result).toBeUndefined();
      });
    });
    describe('when "retryAttempts" does not exist', () => {
      it('should return undefined', () => {
        untypedServer.options.retryAttempts = undefined;
        const result = server.handleClose();
        expect(result).toBeUndefined();
      });
    });
    describe('when "retryAttemptsCount" count is max', () => {
      it('should return undefined', () => {
        untypedServer.options.retryAttempts = 3;
        untypedServer.retryAttemptsCount = 3;
        const result = server.handleClose();
        expect(result).toBeUndefined();
      });
    });
    describe('otherwise', () => {
      it('should return delay (ms)', () => {
        untypedServer.options = {};
        untypedServer.isExplicitlyTerminated = false;
        untypedServer.options.retryAttempts = 3;
        untypedServer.retryAttemptsCount = 2;
        untypedServer.options.retryDelay = 3;
        const result = server.handleClose();
        expect(result).toBeDefined();
      });
    });
  });

  describe('handleEvent', () => {
    const channel = 'test';
    const data = 'test';

    it('should call handler with expected arguments', async () => {
      const handler = vi.fn();
      untypedServer.messageHandlers = objectToMap({
        [channel]: handler,
      });

      await server.handleEvent(
        channel,
        { pattern: '', data },
        new BaseRpcContext([]),
      );
      expect(handler).toHaveBeenCalledWith(data, expect.any(BaseRpcContext));
    });
  });

  describe('maxBufferSize', () => {
    const DEFAULT_MAX_BUFFER_SIZE = (512 * 1024 * 1024) / 4;

    describe('when maxBufferSize is not provided', () => {
      it('should use default maxBufferSize', () => {
        const server = new ServerTCP({});
        const socket = new NetSocket();
        const jsonSocket = server['getSocketInstance'](socket);
        expect(jsonSocket['maxBufferSize']).toBe(DEFAULT_MAX_BUFFER_SIZE);
      });
    });

    describe('when maxBufferSize is provided', () => {
      it('should use custom maxBufferSize', () => {
        const customSize = 5000;
        const server = new ServerTCP({ maxBufferSize: customSize });
        const socket = new NetSocket();
        const jsonSocket = server['getSocketInstance'](socket);
        expect(jsonSocket['maxBufferSize']).toBe(customSize);
      });

      it('should pass maxBufferSize to JsonSocket', () => {
        const customSize = 10000;
        const server = new ServerTCP({ maxBufferSize: customSize });
        const socket = new NetSocket();
        const jsonSocket = server['getSocketInstance'](socket);
        expect(jsonSocket['maxBufferSize']).toBe(customSize);
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

        const server = new ServerTCP({
          socketClass: CustomSocket as any,
          maxBufferSize: 5000,
        });
        const socket = new NetSocket();
        const customSocket = server['getSocketInstance'](socket);
        expect(customSocket).toBeInstanceOf(CustomSocket);
        // Custom socket should not have maxBufferSize property
        expect(customSocket['maxBufferSize']).toBeUndefined();
      });
    });
  });
});
