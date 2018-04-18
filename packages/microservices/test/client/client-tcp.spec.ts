import * as sinon from 'sinon';
import { expect } from 'chai';
import { ClientTCP } from '../../client/client-tcp';
import { MESSAGE_EVENT } from '../../constants';

describe('ClientTCP', () => {
  const client = new ClientTCP({});
  let socket: {
    connect: sinon.SinonSpy;
    publish: sinon.SinonSpy;
    _socket: {
      removeListener: sinon.SinonSpy;
      once: sinon.SinonStub;
    };
    on: sinon.SinonStub;
    end: sinon.SinonSpy;
    sendMessage: sinon.SinonSpy;
  };
  let createSocketStub: sinon.SinonStub;

  beforeEach(() => {
    const onFakeCallback = (event, callback) =>
      event !== 'error' && event !== 'close' && callback({});

    socket = {
      connect: sinon.spy(),
      publish: sinon.spy(),
      on: sinon.stub().callsFake(onFakeCallback),
      _socket: {
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
    });
    it('should connect to server when is not connected', done => {
      client['publish'](msg, () => ({})).then(() => {
        expect(socket.connect.calledOnce).to.be.true;
        done();
      });
    });
    it('should not connect to server when is already connected', () => {
      (client as any).isConnected = true;
      client['publish'](msg, () => ({}));
      expect(socket.connect.called).to.be.false;
    });
    describe('after connection', () => {
      it('should send message', done => {
        (client as any).isConnected = false;
        client['publish'](msg, () => ({})).then(() => {
          expect(socket.sendMessage.called).to.be.true;
          expect(socket.sendMessage.calledWith(msg)).to.be.true;
          done();
        });
      });
      it('should listen on messages', done => {
        (client as any).isConnected = false;
        client['publish'](msg, () => ({})).then(() => {
          expect(socket.on.called).to.be.true;
          done();
        });
      });
    });
  });
  describe('handleResponse', () => {
    let callback;
    describe('when disposed', () => {
      const context = () => ({});
      beforeEach(() => {
        callback = sinon.spy();
        client.handleResponse(socket, callback, { isDisposed: true }, context);
      });
      it('should remove listener', () => {
        expect(socket._socket.removeListener.called).to.be.true;
        expect(socket._socket.removeListener.calledWith(MESSAGE_EVENT, context))
          .to.be.true;
      });
      it('should emit disposed callback', () => {
        expect(callback.called).to.be.true;
        expect(
          callback.calledWith({
            err: undefined,
            response: null,
            isDisposed: true,
          }),
        ).to.be.true;
      });
    });
    describe('when not disposed', () => {
      let buffer;
      const context = () => ({});
      beforeEach(() => {
        buffer = { err: null, response: 'res' };
        callback = sinon.spy();
        client.handleResponse(socket, callback, buffer, context);
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
  describe('close', () => {
    beforeEach(() => {
      (client as any).socket = socket;
      (client as any).isConnected = true;
      client.close();
    });
    it('should end() socket', () => {
      expect(socket.end.called).to.be.true;
    });
    it('should set "isConnected" to false', () => {
      expect((client as any).isConnected).to.be.false;
    });
    it('should set "socket" to null', () => {
      expect((client as any).socket).to.be.null;
    });
  });
  describe('handleError', () => {
    it('should call callback with error', () => {
      const callback = sinon.spy();
      const err = { code: 'ECONNREFUSED' };
      client.handleError(err, callback);

      expect(callback.called).to.be.true;
      expect(callback.calledWith(err, null)).to.be.true;
    });
    it('should not call callback with error', () => {
      const callback = sinon.spy();
      const err = {};
      client.handleError(err, callback);

      expect(callback.called).to.be.false;
    });
  });
});
