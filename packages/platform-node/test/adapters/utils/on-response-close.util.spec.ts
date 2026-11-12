import { EventEmitter } from 'events';
import { PassThrough } from 'stream';
import { onResponseClose } from '../../../adapters/utils/on-response-close.util.js';

describe('onResponseClose', () => {
  // The response of a pipelined request that waits behind another one: it
  // has no socket of its own, only the one of its request
  const createResponse = (socket?: unknown) =>
    Object.assign(new PassThrough(), { req: { socket } });
  const createConnection = () =>
    Object.assign(new EventEmitter(), { destroyed: false });

  it('should call the listener once the response has finished', async () => {
    const listener = vi.fn();
    const response = createResponse(createConnection());

    onResponseClose(response, listener);
    response.resume();
    response.end();

    await vi.waitFor(() => expect(listener).toHaveBeenCalledOnce());
  });

  it('should call the listener when the connection closes first', async () => {
    const listener = vi.fn();
    const connection = createConnection();
    const response = createResponse(connection);

    onResponseClose(response, listener);
    connection.emit('close');

    expect(listener).toHaveBeenCalledOnce();
    response.destroy();
    await new Promise(resolve => setImmediate(resolve));
    expect(listener).toHaveBeenCalledOnce();
  });

  it('should call the listener when the connection has already closed', async () => {
    const listener = vi.fn();
    const connection = createConnection();
    connection.destroyed = true;

    onResponseClose(createResponse(connection), listener);

    await vi.waitFor(() => expect(listener).toHaveBeenCalledOnce());
  });

  it('should listen to a connection once for all the responses on it', () => {
    const connection = createConnection();
    const listeners = Array.from({ length: 20 }, () => vi.fn());

    for (const listener of listeners) {
      onResponseClose(createResponse(connection), listener);
    }
    expect(connection.listenerCount('close')).toBe(1);
    connection.emit('close');

    for (const listener of listeners) {
      expect(listener).toHaveBeenCalledOnce();
    }
  });

  it('should not call the listener of a finished response again when the connection closes', async () => {
    const connection = createConnection();
    const listener = vi.fn();
    const response = createResponse(connection);

    onResponseClose(response, listener);
    response.resume();
    response.end();
    await vi.waitFor(() => expect(listener).toHaveBeenCalledOnce());
    connection.emit('close');

    expect(listener).toHaveBeenCalledOnce();
  });

  it('should rely on the response alone without a connection to listen to', async () => {
    const listener = vi.fn();
    const response = createResponse(undefined);

    onResponseClose(response, listener);
    response.destroy();

    await vi.waitFor(() => expect(listener).toHaveBeenCalledOnce());
  });
});
