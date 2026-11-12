import { expect } from 'chai';
import { EventEmitter } from 'events';
import * as sinon from 'sinon';
import { PassThrough } from 'stream';
import { onResponseClose } from '../../../adapters/utils/on-response-close.util';

describe('onResponseClose', () => {
  // The response of a pipelined request that waits behind another one: it
  // has no socket of its own, only the one of its request
  const createResponse = (socket?: unknown) =>
    Object.assign(new PassThrough(), { req: { socket } });
  const createConnection = () =>
    Object.assign(new EventEmitter(), { destroyed: false });
  const calledOnce = async (listener: sinon.SinonSpy) => {
    for (let i = 0; i < 10 && !listener.called; i++) {
      await new Promise(resolve => setImmediate(resolve));
    }
    expect(listener.calledOnce).to.be.true;
  };

  it('should call the listener once the response has finished', async () => {
    const listener = sinon.spy();
    const response = createResponse(createConnection());

    onResponseClose(response, listener);
    response.resume();
    response.end();

    await calledOnce(listener);
  });

  it('should call the listener when the connection closes first', async () => {
    const listener = sinon.spy();
    const connection = createConnection();
    const response = createResponse(connection);

    onResponseClose(response, listener);
    connection.emit('close');

    expect(listener.calledOnce).to.be.true;
    response.destroy();
    await new Promise(resolve => setImmediate(resolve));
    expect(listener.calledOnce).to.be.true;
  });

  it('should call the listener when the connection has already closed', async () => {
    const listener = sinon.spy();
    const connection = createConnection();
    connection.destroyed = true;

    onResponseClose(createResponse(connection), listener);

    await calledOnce(listener);
  });

  it('should listen to a connection once for all the responses on it', () => {
    const connection = createConnection();
    const listeners = Array.from({ length: 20 }, () => sinon.spy());

    for (const listener of listeners) {
      onResponseClose(createResponse(connection), listener);
    }
    expect(connection.listenerCount('close')).to.equal(1);
    connection.emit('close');

    for (const listener of listeners) {
      expect(listener.calledOnce).to.be.true;
    }
  });

  it('should not call the listener of a finished response again when the connection closes', async () => {
    const connection = createConnection();
    const listener = sinon.spy();
    const response = createResponse(connection);

    onResponseClose(response, listener);
    response.resume();
    response.end();
    await calledOnce(listener);
    connection.emit('close');

    expect(listener.calledOnce).to.be.true;
  });

  it('should rely on the response alone without a connection to listen to', async () => {
    const listener = sinon.spy();
    const response = createResponse(undefined);

    onResponseClose(response, listener);
    response.destroy();

    await calledOnce(listener);
  });
});
