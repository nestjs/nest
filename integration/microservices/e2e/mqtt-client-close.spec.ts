import { ClientMqtt, MqttRecordBuilder } from '@nestjs/microservices';
import { randomUUID } from 'crypto';
import { once } from 'events';
import { connect, MqttClient } from 'mqtt';
import * as net from 'net';
import { lastValueFrom } from 'rxjs';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('MQTT client close', () => {
  let client: ClientMqtt;
  let connection: MqttClient | undefined;
  let observer: MqttClient;
  let received: string[];
  let topics: string;
  let proxy: net.Server;
  let sockets: Set<net.Socket>;
  let refusing: boolean;
  let holdingBackAnswers: boolean;

  async function until(condition: () => boolean, what: string) {
    const deadline = Date.now() + 5000;
    while (!condition()) {
      if (Date.now() > deadline) {
        throw new Error(`Timed out waiting for ${what}`);
      }
      await sleep(10);
    }
  }

  function loseBroker() {
    refusing = true;
    sockets.forEach(socket => socket.destroy());
  }

  function closesInTime() {
    return Promise.race([
      client.close().then(() => true),
      sleep(2000).then(() => false),
    ]);
  }

  beforeEach(async () => {
    received = [];
    // Its own topics, so that the will of a client dropped by an earlier test
    // is not taken for one of this test
    topics = `mqtt-client-close/${randomUUID()}`;
    sockets = new Set();
    refusing = false;
    holdingBackAnswers = false;
    connection = undefined;
    // Stands between the client and the broker, so that the connection can
    // be dropped and refused, and the answers of the broker held back
    proxy = net.createServer(downstream => {
      if (refusing) {
        downstream.destroy();
        return;
      }
      const upstream = net.connect(1883, '127.0.0.1');
      downstream.pipe(upstream);
      upstream.on('data', chunk => {
        if (!holdingBackAnswers) {
          downstream.write(chunk);
        }
      });
      for (const [socket, peer] of [
        [downstream, upstream],
        [upstream, downstream],
      ]) {
        sockets.add(socket);
        socket.on('error', () => peer.destroy());
        socket.on('close', () => {
          sockets.delete(socket);
          peer.destroy();
        });
      }
    });
    proxy.listen(0, '127.0.0.1');
    await once(proxy, 'listening');

    // Talks to the broker directly and sees what reaches it
    observer = connect('mqtt://127.0.0.1:1883');
    observer.on('message', topic => received.push(topic));
    await once(observer, 'connect');
    await observer.subscribeAsync(`${topics}/#`);

    client = new ClientMqtt({
      url: `mqtt://127.0.0.1:${(proxy.address() as net.AddressInfo).port}`,
      reconnectPeriod: 100,
      will: {
        topic: `${topics}/will`,
        payload: 'gone',
        qos: 0,
        retain: false,
      },
    });
    await client.connect();
    connection = client.unwrap<MqttClient>();
  });

  afterEach(async () => {
    // Ends the connection that a close() still pending would leave behind
    connection?.end(true);
    await observer.endAsync();
    sockets.forEach(socket => socket.destroy());
    await new Promise(resolve => proxy.close(resolve));
  });

  it('should close while the broker is unreachable and a request is pending', async () => {
    const failure = lastValueFrom(client.send(`${topics}/request`, {})).catch(
      (err: Error) => err,
    );
    await until(
      () => received.includes(`${topics}/request`),
      'the request to reach the broker',
    );
    loseBroker();
    await until(
      () => !connection!.connected,
      'the client to notice the lost connection',
    );

    expect(await closesInTime()).toBe(true);
    expect(await failure).toEqual(
      expect.objectContaining({ message: 'Connection closed' }),
    );
  });

  it('should close when the broker is lost while a request is being unsubscribed', async () => {
    const failure = lastValueFrom(client.send(`${topics}/request`, {})).catch(
      (err: Error) => err,
    );
    await until(
      () => received.includes(`${topics}/request`),
      'the request to reach the broker',
    );

    const closed = closesInTime();
    // In the same tick, so that no answer to the unsubscribe gets through
    loseBroker();

    expect(await closed).toBe(true);
    expect(await failure).toEqual(
      expect.objectContaining({ message: 'Connection closed' }),
    );
  });

  it('should close while the broker is unreachable and a message was not acknowledged', async () => {
    holdingBackAnswers = true;
    client
      .emit(`${topics}/event`, new MqttRecordBuilder('data').setQoS(1).build())
      .subscribe({ error: () => {} });
    await until(
      () => received.includes(`${topics}/event`),
      'the event to reach the broker',
    );
    loseBroker();
    await until(
      () => !connection!.connected,
      'the client to notice the lost connection',
    );

    expect(await closesInTime()).toBe(true);
  });

  it('should still disconnect cleanly from a reachable broker', async () => {
    const failure = lastValueFrom(client.send(`${topics}/request`, {})).catch(
      (err: Error) => err,
    );
    await until(
      () => received.includes(`${topics}/request`),
      'the request to reach the broker',
    );

    await client.close();

    expect(await failure).toEqual(
      expect.objectContaining({ message: 'Connection closed' }),
    );
    // A broker publishes the will of a client that goes away without saying so
    await sleep(300);
    expect(received).not.toContain(`${topics}/will`);
  });
});
