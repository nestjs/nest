import { expect } from 'chai';
import { once } from 'events';
import { createServer } from 'http';
import * as sinon from 'sinon';
import { WebSocket, WebSocketServer } from 'ws';
import { WsAdapter } from '../adapters/ws-adapter';

describe('WsAdapter maxPayload', () => {
  const limit = 1024 * 1024;
  let adapter: WsAdapter;
  let server: WebSocketServer;
  afterEach(async () => {
    await adapter.close(server);
    await adapter.dispose();
  });

  // Resolves with the close code, or 'open' if the server took the message
  const sendOfSize = async (size: number) => {
    // ws reports the message it refused as an error of the client
    sinon.stub(adapter['logger'], 'error');
    server.on('connection', client =>
      client.on('message', () => client.send('received')),
    );
    if (!server.address()) {
      await once(server, 'listening');
    }
    const port = (server.address() as { port: number }).port;
    const client = new WebSocket(`ws://127.0.0.1:${port}`);
    await once(client, 'open');
    client.send(Buffer.alloc(size));
    return new Promise<number | 'open'>(resolve => {
      client.once('message', () => {
        resolve('open');
        client.terminate();
      });
      client.once('close', code => resolve(code));
    });
  };

  it('should close a client that sends a message larger than 1 MB by default', async () => {
    adapter = new WsAdapter();
    server = adapter.create(0, {});

    expect(await sendOfSize(limit + 1)).to.equal(1009);
  });

  it('should take a message of 1 MB by default', async () => {
    adapter = new WsAdapter();
    server = adapter.create(0, {});

    expect(await sendOfSize(limit)).to.equal('open');
  });

  it('should take the limit from the adapter options', async () => {
    adapter = new WsAdapter(undefined, { maxPayload: 1024 });
    server = adapter.create(0, {});

    expect(await sendOfSize(1025)).to.equal(1009);
  });

  it('should let the "maxPayload" of a gateway take precedence', async () => {
    adapter = new WsAdapter(undefined, { maxPayload: 1024 });
    const options = { maxPayload: 2 * limit };
    server = adapter.create(0, options);

    expect(await sendOfSize(limit + 1)).to.equal('open');
    expect(options).to.deep.equal({ maxPayload: 2 * limit });
  });

  it('should apply the limit to a gateway on the HTTP server', () => {
    adapter = new WsAdapter(createServer());
    const options = { path: '/live' };
    server = adapter.create(0, options);

    expect(server.options.maxPayload).to.equal(limit);
    expect(options).to.deep.equal({ path: '/live' });
  });
});

describe('WsAdapter createWithoutListener', () => {
  it('should create a server that does not listen', async () => {
    const adapter = new WsAdapter();
    const server = adapter.createWithoutListener({ path: '/live' });

    expect(server.options.noServer).to.be.true;
    expect(() => server.address()).to.throw(/noServer/);
    await adapter.close(server);
  });

  it('should refuse a namespace, as create() does', () => {
    const adapter = new WsAdapter();
    sinon.stub(adapter['logger'], 'error');

    expect(() =>
      adapter.createWithoutListener({ namespace: '/chat' }),
    ).to.throw(/does not support namespaces/);
  });
});
