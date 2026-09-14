/**
 * Integration test for TCP transport shutdown.
 *
 * "net.Server#close" only stops the server from accepting new connections, so
 * before the fix a connection established prior to shutdown stayed open after
 * "app.close()" resolved: the process was kept alive by the dangling socket and
 * message handlers kept executing on it.
 */
import { Controller, INestMicroservice } from '@nestjs/common';
import {
  MessagePattern,
  MicroserviceOptions,
  Transport,
} from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import * as net from 'net';

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
