import { Controller, INestMicroservice } from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  MessagePattern,
  MicroserviceOptions,
  Transport,
} from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { once } from 'events';
import * as net from 'net';
import { firstValueFrom, timeout } from 'rxjs';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('MQTT transport (graceful shutdown across a reconnect)', () => {
  let events: string[];
  let app: INestMicroservice | undefined;
  let client: ClientProxy;
  let proxy: net.Server;
  let sockets: Set<net.Socket>;
  let refusing: boolean;

  @Controller()
  class SlowController {
    @MessagePattern('graceful-shutdown-reconnect/slow')
    async slow(data: { id: number; duration: number }) {
      const log = events;
      log.push(`handler ${data.id} started`);
      await sleep(data.duration);
      log.push(`handler ${data.id} finished`);
      return `reply ${data.id}`;
    }
  }

  function send(id: number, duration: number, waitFor = 5000) {
    return firstValueFrom(
      client
        .send<string>('graceful-shutdown-reconnect/slow', { id, duration })
        .pipe(timeout(waitFor)),
    );
  }

  async function until(condition: () => boolean, what: string) {
    const deadline = Date.now() + 5000;
    while (!condition()) {
      if (Date.now() > deadline) {
        throw new Error(`Timed out waiting for ${what}`);
      }
      await sleep(10);
    }
  }

  beforeEach(async () => {
    events = [];
    sockets = new Set();
    refusing = false;
    // Stands between the server and the broker, so that the connection can
    // be dropped and refused for a while
    proxy = net.createServer(downstream => {
      if (refusing) {
        downstream.destroy();
        return;
      }
      const upstream = net.connect(1883, '127.0.0.1');
      for (const [socket, peer] of [
        [downstream, upstream],
        [upstream, downstream],
      ]) {
        sockets.add(socket);
        socket.pipe(peer);
        socket.on('error', () => peer.destroy());
        socket.on('close', () => {
          sockets.delete(socket);
          peer.destroy();
        });
      }
    });
    proxy.listen(0, '127.0.0.1');
    await once(proxy, 'listening');

    client = ClientProxyFactory.create({
      transport: Transport.MQTT,
      options: { url: 'mqtt://127.0.0.1:1883' },
    });
    await client.connect();
  });

  afterEach(async () => {
    await client.close();
    await app?.close();
    app = undefined;
    sockets.forEach(socket => socket.destroy());
    await new Promise(resolve => proxy.close(resolve));
  });

  it('should take no new request when mqtt reconnects while it is closing', async () => {
    const module = await Test.createTestingModule({
      controllers: [SlowController],
    }).compile();
    app = module.createNestMicroservice<MicroserviceOptions>({
      transport: Transport.MQTT,
      options: {
        url: `mqtt://127.0.0.1:${(proxy.address() as net.AddressInfo).port}`,
        gracefulShutdown: true,
        reconnectPeriod: 100,
      },
    });
    await app.listen();
    const mqttClient = app.unwrap<any>();
    // The broker answers the packets of a connection in order, so once it
    // has acknowledged this message, it has registered the subscriptions
    const ready = () =>
      mqttClient.publishAsync('graceful-shutdown-reconnect/ready', '', {
        qos: 1,
      });
    await ready();
    const first = send(1, 2000);
    await until(() => events.includes('handler 1 started'), 'handler 1');

    refusing = true;
    sockets.forEach(socket => socket.destroy());
    await until(() => !mqttClient.connected, 'the disconnect');
    const closing = app.close();

    const reconnected = new Promise(resolve =>
      mqttClient.once('connect', resolve),
    );
    refusing = false;
    await reconnected;
    // mqtt would have resubscribed as it connected, before this message
    await ready();
    const second = send(2, 0, 1000).then(
      () => 'answered',
      () => 'not answered',
    );
    await closing;
    app = undefined;

    await expect(first).resolves.toBe('reply 1');
    await expect(second).resolves.toBe('not answered');
    expect(events).not.toContain('handler 2 started');
  });
});
