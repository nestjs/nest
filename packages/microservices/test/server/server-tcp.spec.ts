import { expect } from 'chai';
import { Socket as NetSocket } from 'net';
import * as sinon from 'sinon';
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
    const socket = { on: sinon.spy() };

    beforeEach(() => {
      sinon.stub(server, 'getSocketInstance' as any).callsFake(() => socket);
    });
    it('should bind message and error events to handler', () => {
      server.bindHandler(null!);
      expect(socket.on.calledTwice).to.be.true;
    });
  });
  describe('close', () => {
    const tcpServer = { close: sinon.spy() };
    beforeEach(() => {
      untypedServer.server = tcpServer;
    });
    it('should close server', () => {
      server.close();
      expect(tcpServer.close.called).to.be.true;
    });
  });
  describe('listen', () => {
    const serverMock = { listen: sinon.spy(), once: sinon.spy() };
    beforeEach(() => {
      untypedServer.server = serverMock;
    });
    it('should call native listen method with expected arguments', () => {
      const callback = () => {};
      server.listen(callback);
      expect(
        serverMock.listen.calledWith(
          untypedServer.port,
          untypedServer.host,
          callback,
        ),
      ).to.be.true;
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
        sendMessage: sinon.spy(),
      };
    });
    it('should send NO_MESSAGE_HANDLER error if key does not exists in handlers object', async () => {
      await server.handleMessage(socket, msg);
      expect(
        socket.sendMessage.calledWith({
          id: msg.id,
          status: 'error',
          err: NO_MESSAGE_HANDLER,
        }),
      ).to.be.true;
    });
    it('should call handler if exists in handlers object', async () => {
      const handler = sinon.spy();
      untypedServer.messageHandlers = objectToMap({
        [msg.pattern]: handler as any,
      });
      await server.handleMessage(socket, msg);
      expect(handler.calledOnce).to.be.true;
    });
  });
  describe('handleClose', () => {
    describe('when is terminated', () => {
      it('should return undefined', () => {
        untypedServer.isExplicitlyTerminated = true;
        const result = server.handleClose();
        expect(result).to.be.undefined;
      });
    });
    describe('when "retryAttempts" does not exist', () => {
      it('should return undefined', () => {
        untypedServer.options.retryAttempts = undefined;
        const result = server.handleClose();
        expect(result).to.be.undefined;
      });
    });
    describe('when "retryAttemptsCount" count is max', () => {
      it('should return undefined', () => {
        untypedServer.options.retryAttempts = 3;
        untypedServer.retryAttemptsCount = 3;
        const result = server.handleClose();
        expect(result).to.be.undefined;
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
        expect(result).to.be.not.undefined;
      });
    });
  });

  describe('handleEvent', () => {
    const channel = 'test';
    const data = 'test';

    it('should call handler with expected arguments', async () => {
      const handler = sinon.spy();
      untypedServer.messageHandlers = objectToMap({
        [channel]: handler,
      });

      await server.handleEvent(
        channel,
        { pattern: '', data },
        new BaseRpcContext([]),
      );
      expect(handler.calledWith(data)).to.be.true;
    });
  });

  describe('maxBufferSize', () => {
    const DEFAULT_MAX_BUFFER_SIZE = (512 * 1024 * 1024) / 4;

    describe('when maxBufferSize is not provided', () => {
      it('should use default maxBufferSize', () => {
        const server = new ServerTCP({});
        const socket = new NetSocket();
        const jsonSocket = server['getSocketInstance'](socket);
        expect(jsonSocket['maxBufferSize']).to.equal(DEFAULT_MAX_BUFFER_SIZE);
      });
    });

    describe('when maxBufferSize is provided', () => {
      it('should use custom maxBufferSize', () => {
        const customSize = 5000;
        const server = new ServerTCP({ maxBufferSize: customSize });
        const socket = new NetSocket();
        const jsonSocket = server['getSocketInstance'](socket);
        expect(jsonSocket['maxBufferSize']).to.equal(customSize);
      });

      it('should pass maxBufferSize to JsonSocket', () => {
        const customSize = 10000;
        const server = new ServerTCP({ maxBufferSize: customSize });
        const socket = new NetSocket();
        const jsonSocket = server['getSocketInstance'](socket);
        expect(jsonSocket['maxBufferSize']).to.equal(customSize);
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
        expect(customSocket).to.be.instanceOf(CustomSocket);
        // Custom socket should not have maxBufferSize property
        expect(customSocket['maxBufferSize']).to.be.undefined;
      });
    });
  });
});
