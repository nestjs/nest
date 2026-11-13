/**
 * Integration test for TCP transport shutdown.
 *
 * "net.Server#close" only stops the server from accepting new connections, so
 * before the fix a connection established prior to shutdown stayed open after
 * "app.close()" resolved: the process was kept alive by the dangling socket and
 * message handlers kept executing on it.
 */
import {
  Controller,
  INestMicroservice,
  Injectable,
  OnApplicationShutdown,
} from '@nestjs/common';
import {
  MessagePattern,
  MicroserviceOptions,
  Transport,
} from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import * as fs from 'fs';
import * as net from 'net';
import * as path from 'path';
import * as tls from 'tls';

let handlerCalls = 0;

@Controller()
class PingController {
  @MessagePattern({ cmd: 'ping' })
  ping(): string {
    handlerCalls++;
    return 'pong';
  }
}

function frame(obj: unknown): string {
  const json = JSON.stringify(obj);
  return `${json.length}#${json}`;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('TCP transport shutdown', () => {
  let app: INestMicroservice;
  let port: number;

  beforeEach(async () => {
    handlerCalls = 0;
    const module = await Test.createTestingModule({
      controllers: [PingController],
    }).compile();

    app = module.createNestMicroservice<MicroserviceOptions>({
      transport: Transport.TCP,
      options: { host: '127.0.0.1', port: 0 },
    });
    await app.listen();
    const netServer = app.unwrap<net.Server>();
    port = (netServer.address() as net.AddressInfo).port;
  });

  afterEach(async () => {
    try {
      await app.close();
    } catch {
      // already closed by the test
    }
  });

  function openSockets(): Set<net.Socket> {
    return (app.getTransportServer() as any).openSockets;
  }

  /**
   * Opens a connection and waits until the server has accepted it, so that the
   * assertions below never race the server's "connection" event. The server
   * registers its own listener first, so by the time this one runs the
   * connection is fully set up.
   */
  async function connect(): Promise<net.Socket> {
    const accepted = new Promise<void>(resolve =>
      app.unwrap<net.Server>().once('connection', () => resolve()),
    );
    const socket = net.createConnection(port, '127.0.0.1');
    socket.on('error', () => {});
    await Promise.all([
      new Promise(resolve => socket.once('connect', resolve)),
      accepted,
    ]);
    return socket;
  }

  it('should have destroyed pre-existing connections by the time close() resolves', async () => {
    const clientSocket = await connect();
    const closed = new Promise<void>(resolve =>
      clientSocket.once('close', resolve),
    );

    // The server-side halves of the accepted connections. A connection still
    // live once "close()" has resolved keeps the process alive and keeps
    // feeding message handlers.
    const serverSockets = [...openSockets()];
    expect(serverSockets).to.have.lengthOf(1);

    await app.close();

    expect(serverSockets.every(socket => socket.destroyed)).to.be.true;
    await closed;
  });

  it('should not execute handlers over a pre-existing connection after shutdown', async () => {
    const socket = await connect();

    socket.write(frame({ pattern: { cmd: 'ping' }, data: null, id: '1' }));
    await sleep(200);
    expect(handlerCalls).to.equal(1);

    await app.close();

    socket.write(frame({ pattern: { cmd: 'ping' }, data: null, id: '2' }));
    await sleep(300);

    expect(handlerCalls).to.equal(1);
  });

  it('should leave no open sockets tracked after the shutdown', async () => {
    await connect();
    await connect();

    expect(openSockets().size).to.equal(2);

    await app.close();

    expect(openSockets().size).to.equal(0);
  });
});

describe('TCP transport shutdown with "gracefulShutdown"', () => {
  let app: INestMicroservice | undefined;
  let port: number;
  let events: string[];
  let sockets: net.Socket[];

  @Injectable()
  class Resources implements OnApplicationShutdown {
    onApplicationShutdown() {
      events.push('shutdown hook');
    }
  }

  @Controller()
  class SlowController {
    @MessagePattern({ cmd: 'slow' })
    async slow(data: { id: number; duration: number; size?: number }) {
      // A handler that outlives its test must not write to the next one's log
      const log = events;
      log.push(`handler ${data.id} started`);
      await sleep(data.duration);
      log.push(`handler ${data.id} finished`);
      return data.size ? 'x'.repeat(data.size) : `reply ${data.id}`;
    }
  }

  async function createServer(options: Record<string, unknown> = {}) {
    const module = await Test.createTestingModule({
      controllers: [SlowController],
      providers: [Resources],
    }).compile();

    app = module.createNestMicroservice<MicroserviceOptions>({
      transport: Transport.TCP,
      options: { host: '127.0.0.1', port: 0, ...options },
    });
    await app.listen();
    port = (app.unwrap<net.Server>().address() as net.AddressInfo).port;
    return app;
  }

  /**
   * Opens a connection, waits until the server has bound it, and collects the
   * messages the server sends over it. With the certificate of the server, the
   * connection is a TLS one.
   */
  async function connect(certificate?: string) {
    const secure = certificate !== undefined;
    const server = app!.unwrap<net.Server>();
    const bound = new Promise<void>(resolve =>
      server.once(secure ? 'secureConnection' : 'connection', () => resolve()),
    );
    const socket = secure
      ? tls.connect({
          port,
          host: '127.0.0.1',
          // The name the test certificate is issued to
          servername: 'localhost',
          ca: certificate,
        })
      : net.createConnection(port, '127.0.0.1');
    sockets.push(socket);
    socket.on('error', () => {});
    socket.setEncoding('utf8');

    const replies: Array<{ id: string; response?: string }> = [];
    let received = '';
    socket.on('data', (chunk: string) => {
      received += chunk;
      for (;;) {
        const separator = received.indexOf('#');
        const length = Number(received.slice(0, separator));
        if (separator === -1 || received.length - separator - 1 < length) {
          return;
        }
        const start = separator + 1;
        replies.push(JSON.parse(received.slice(start, start + length)));
        received = received.slice(start + length);
      }
    });
    const closed = new Promise<void>(resolve => socket.once('close', resolve));

    await Promise.all([
      new Promise(resolve =>
        socket.once(secure ? 'secureConnect' : 'connect', resolve),
      ),
      bound,
    ]);
    const request = (id: number, duration: number, size?: number) =>
      socket.write(
        frame({
          pattern: { cmd: 'slow' },
          data: { id, duration, size },
          id: String(id),
        }),
      );
    return { socket, replies, closed, request };
  }

  // The server must be closed while the handler runs
  async function handlerStarted(id: number) {
    const deadline = Date.now() + 5000;
    while (!events.includes(`handler ${id} started`)) {
      if (Date.now() > deadline) {
        throw new Error(`Handler ${id} did not start`);
      }
      await sleep(10);
    }
  }

  beforeEach(() => {
    events = [];
    sockets = [];
  });

  afterEach(async () => {
    sockets.forEach(socket => socket.destroy());
    await app?.close();
    app = undefined;
  });

  it('should not wait for a handler in flight by default', async () => {
    const server = await createServer();
    const { replies, closed, request } = await connect();
    request(1, 500);
    await handlerStarted(1);

    await server.close();
    await closed;

    expect(events).toEqual(['handler 1 started', 'shutdown hook']);
    expect(replies).toEqual([]);
  });

  it('should let a handler in flight reply before the shutdown hooks run, then close its connection', async () => {
    const server = await createServer({ gracefulShutdown: true });
    const { replies, closed, request } = await connect();
    request(1, 500);
    await handlerStarted(1);

    await server.close();

    expect(events).toEqual([
      'handler 1 started',
      'handler 1 finished',
      'shutdown hook',
    ]);
    await closed;
    expect(replies).toEqual([
      { id: '1', response: 'reply 1', isDisposed: true },
    ]);
  });

  it('should close as soon as the handler is done, well before "gracePeriod"', async () => {
    const server = await createServer({
      gracefulShutdown: true,
      gracePeriod: 30_000,
    });
    const { replies, closed, request } = await connect();
    request(1, 500);
    await handlerStarted(1);

    const closeCalledAt = Date.now();
    await server.close();

    expect(Date.now() - closeCalledAt).toBeLessThan(5000);
    await closed;
    expect(replies).toHaveLength(1);
  });

  it('should not run a handler for a request that arrives on a connection while it is closing', async () => {
    const server = await createServer({ gracefulShutdown: true });
    const { replies, closed, request } = await connect();
    request(1, 500);
    await handlerStarted(1);

    const closing = server.close();
    await sleep(100);
    request(2, 0);
    await closing;
    await closed;

    expect(events).not.toContain('handler 2 started');
    expect(replies.map(({ id }) => id)).toEqual(['1']);
  });

  it('should close a connection with nothing in flight right away, and the others once their handlers are done', async () => {
    const server = await createServer({ gracefulShutdown: true });
    const idle = await connect();
    const busy = await connect();
    // A connection the server has already answered on, with nothing left
    idle.request(0, 0);
    while (idle.replies.length === 0) {
      await sleep(10);
    }
    void idle.closed.then(() => events.push('idle connection closed'));
    void busy.closed.then(() => events.push('busy connection closed'));
    busy.request(1, 500);
    await handlerStarted(1);

    await server.close();
    await busy.closed;

    expect(events).toEqual([
      'handler 0 started',
      'handler 0 finished',
      'handler 1 started',
      'idle connection closed',
      'handler 1 finished',
      'shutdown hook',
      'busy connection closed',
    ]);
    expect(busy.replies).toHaveLength(1);
  });

  it('should refuse new connections while it waits', async () => {
    const server = await createServer({ gracefulShutdown: true });
    const { request } = await connect();
    request(1, 500);
    await handlerStarted(1);

    const closing = server.close();
    const late = net.createConnection(port, '127.0.0.1');
    const outcome = await new Promise<string>(resolve => {
      late.once('connect', () => resolve('connected'));
      late.once('error', (err: NodeJS.ErrnoException) => resolve(err.code!));
    });
    late.destroy();
    await closing;

    expect(outcome).toBe('ECONNREFUSED');
  });

  it('should close after "gracePeriod" when a handler is still running', async () => {
    const server = await createServer({
      gracefulShutdown: true,
      gracePeriod: 200,
    });
    const { replies, closed, request } = await connect();
    request(1, 3000);
    await handlerStarted(1);

    const closeCalledAt = Date.now();
    await server.close();

    expect(Date.now() - closeCalledAt).toBeLessThan(2000);
    expect(events).toEqual(['handler 1 started', 'shutdown hook']);
    await closed;
    expect(replies).toEqual([]);
  });

  it('should send a large reply in full before it closes the connection', async () => {
    const size = 8 * 1024 * 1024;
    const server = await createServer({ gracefulShutdown: true });
    const { replies, closed, request } = await connect();
    request(1, 200, size);
    await handlerStarted(1);

    await server.close();
    await closed;

    expect(replies).toHaveLength(1);
    expect(replies[0].response).toHaveLength(size);
  });

  it('should let a handler in flight reply over TLS', async () => {
    const read = (file: string) =>
      fs.readFileSync(
        path.join(import.meta.dirname, '../src/tcp-tls', file),
        'utf8',
      );
    const certificate = read('ca.cert.pem');
    const server = await createServer({
      gracefulShutdown: true,
      tlsOptions: { key: read('privkey.pem'), cert: certificate },
    });
    const { replies, closed, request } = await connect(certificate);
    request(1, 500);
    await handlerStarted(1);

    await server.close();
    await closed;

    expect(events).toEqual([
      'handler 1 started',
      'handler 1 finished',
      'shutdown hook',
    ]);
    expect(replies).toEqual([
      { id: '1', response: 'reply 1', isDisposed: true },
    ]);
  });
});
