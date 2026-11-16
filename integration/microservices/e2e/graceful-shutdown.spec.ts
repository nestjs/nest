import {
  Controller,
  INestMicroservice,
  Injectable,
  OnApplicationShutdown,
} from '@nestjs/common';
import {
  ClientOptions,
  ClientProxy,
  ClientProxyFactory,
  Ctx,
  MessagePattern,
  MicroserviceOptions,
  Payload,
  RmqContext,
  Transport,
} from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { connect } from 'amqplib';
import { randomUUID } from 'crypto';
import { firstValueFrom, timeout } from 'rxjs';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const RMQ_URL = 'amqp://0.0.0.0:5672';
// A request left in a queue would reach the server of a later test, so each
// test gets its own queue, which the broker deletes once it is unused
const createRmqOptions = () => ({
  urls: [RMQ_URL],
  queue: `graceful-shutdown-${randomUUID()}`,
  queueOptions: { durable: true, expires: 60_000 },
});

describe.each([
  {
    name: 'REDIS',
    transport: Transport.REDIS,
    connection: { host: '0.0.0.0', port: 6379 },
  },
  {
    name: 'NATS',
    transport: Transport.NATS,
    connection: { servers: 'nats://0.0.0.0:4222' },
  },
  {
    name: 'MQTT',
    transport: Transport.MQTT,
    connection: { url: 'mqtt://0.0.0.0:1883' },
  },
  {
    name: 'RMQ',
    transport: Transport.RMQ,
    connection: createRmqOptions,
  },
] as const)(
  '$name transport (graceful shutdown)',
  ({ transport, connection: getConnection }) => {
    let events: string[];
    let app: INestMicroservice | undefined;
    let client: ClientProxy;
    let connection: Record<string, unknown>;

    @Injectable()
    class Resources implements OnApplicationShutdown {
      onApplicationShutdown() {
        events.push('shutdown hook');
      }
    }

    @Controller()
    class SlowController {
      @MessagePattern('slow')
      async slow(data: { id: number; duration: number }) {
        // A handler that outlives its test must not write to the next one's log
        const log = events;
        log.push(`handler ${data.id} started`);
        await sleep(data.duration);
        log.push(`handler ${data.id} finished`);
        return `reply ${data.id}`;
      }
    }

    async function createServer(options: Record<string, unknown> = {}) {
      const module = await Test.createTestingModule({
        controllers: [SlowController],
        providers: [Resources],
      }).compile();

      app = module.createNestMicroservice<MicroserviceOptions>({
        transport,
        options: { ...connection, ...options },
      } as MicroserviceOptions);
      await app.listen();
      if (transport === Transport.NATS) {
        // The server subscribes without waiting for the broker to register
        // the subscriptions, so a request sent right away could find none
        await app.unwrap<{ flush(): Promise<void> }>().flush();
      }
      if (transport === Transport.MQTT) {
        // Same here. The broker answers the packets of a connection in order,
        // so once it has acknowledged this message, it has registered them
        await app
          .unwrap<{
            publishAsync(
              topic: string,
              message: string,
              options: { qos: number },
            ): Promise<unknown>;
          }>()
          .publishAsync('graceful-shutdown/ready', '', { qos: 1 });
      }
      return app;
    }

    function send(id: number, duration: number, waitFor = 5000) {
      return firstValueFrom(
        client.send<string>('slow', { id, duration }).pipe(timeout(waitFor)),
      );
    }

    // The server must be closed while the handler runs, however long the
    // message takes to arrive
    async function handlerStarted(id: number) {
      const deadline = Date.now() + 5000;
      while (!events.includes(`handler ${id} started`)) {
        if (Date.now() > deadline) {
          throw new Error(`Handler ${id} did not start`);
        }
        await sleep(10);
      }
    }

    beforeEach(async () => {
      events = [];
      connection =
        typeof getConnection === 'function' ? getConnection() : getConnection;
      client = ClientProxyFactory.create({
        transport,
        options: connection,
      } as ClientOptions);
      await client.connect();
    });

    afterEach(async () => {
      await client.close();
      await app?.close();
      app = undefined;
    });

    it('should not wait for a handler in flight by default', async () => {
      const server = await createServer();
      const reply = send(1, 500, 1500).catch((err: Error) => err.name);
      await handlerStarted(1);

      await server.close();

      expect(events).toEqual(['handler 1 started', 'shutdown hook']);
      await expect(reply).resolves.toBe('TimeoutError');
    });

    it('should let a handler in flight reply before the shutdown hooks run', async () => {
      const server = await createServer({ gracefulShutdown: true });
      const reply = send(1, 500);
      await handlerStarted(1);

      await server.close();

      await expect(reply).resolves.toBe('reply 1');
      expect(events).toEqual([
        'handler 1 started',
        'handler 1 finished',
        'shutdown hook',
      ]);
    });

    it('should close as soon as the handler is done, well before "gracePeriod"', async () => {
      const server = await createServer({
        gracefulShutdown: true,
        gracePeriod: 30_000,
      });
      const reply = send(1, 500);
      await handlerStarted(1);

      const closeCalledAt = Date.now();
      await server.close();

      expect(Date.now() - closeCalledAt).toBeLessThan(5000);
      await expect(reply).resolves.toBe('reply 1');
    });

    it('should take no new request while it is closing', async () => {
      const server = await createServer({ gracefulShutdown: true });
      const first = send(1, 500);
      await handlerStarted(1);

      const closing = server.close();
      await sleep(100);
      // Redis, MQTT and RabbitMQ leave the request unanswered, NATS rejects it
      // for lack of a subscriber. Either way it must not reach the server that
      // is closing.
      const second = send(2, 0, 1000).then(
        () => 'answered',
        () => 'not answered',
      );
      await closing;

      await expect(first).resolves.toBe('reply 1');
      await expect(second).resolves.toBe('not answered');
      expect(events).not.toContain('handler 2 started');
    });

    it('should close after "gracePeriod" when a handler is still running', async () => {
      const server = await createServer({
        gracefulShutdown: true,
        gracePeriod: 200,
      });
      void send(1, 3000).catch(() => undefined);
      await handlerStarted(1);

      const closeCalledAt = Date.now();
      await server.close();

      expect(Date.now() - closeCalledAt).toBeLessThan(2000);
      expect(events).toEqual(['handler 1 started', 'shutdown hook']);
    });
  },
);

describe('RMQ transport (graceful shutdown) with "noAck: false"', () => {
  let events: string[];
  let app: INestMicroservice | undefined;
  let client: ClientProxy;

  @Controller()
  class AcknowledgingController {
    @MessagePattern('slow')
    async slow(@Payload() duration: number, @Ctx() context: RmqContext) {
      const log = events;
      log.push('handler started');
      await sleep(duration);
      context.getChannelRef().ack(context.getMessage());
      log.push('handler acknowledged');
      return 'reply';
    }
  }

  async function countMessagesLeft(queue: string) {
    const connection = await connect(RMQ_URL);
    try {
      const channel = await connection.createChannel();
      const { messageCount } = await channel.checkQueue(queue);
      return messageCount;
    } finally {
      await connection.close();
    }
  }

  afterEach(async () => {
    await client.close();
    await app?.close();
    app = undefined;
  });

  it('should let a handler in flight acknowledge its message before the channel is closed', async () => {
    events = [];
    const options = createRmqOptions();
    client = ClientProxyFactory.create({ transport: Transport.RMQ, options });
    await client.connect();
    const module = await Test.createTestingModule({
      controllers: [AcknowledgingController],
    }).compile();
    app = module.createNestMicroservice<MicroserviceOptions>({
      transport: Transport.RMQ,
      options: { ...options, noAck: false, gracefulShutdown: true },
    });
    await app.listen();

    const reply = firstValueFrom(
      client.send<string>('slow', 500).pipe(timeout(5000)),
    );
    const deadline = Date.now() + 5000;
    while (!events.includes('handler started')) {
      if (Date.now() > deadline) {
        throw new Error('The handler did not start');
      }
      await sleep(10);
    }

    await app.close();

    await expect(reply).resolves.toBe('reply');
    expect(events).toEqual(['handler started', 'handler acknowledged']);
    // An unacknowledged message goes back to the queue when its channel
    // closes, for another instance to handle again
    await expect(countMessagesLeft(options.queue)).resolves.toBe(0);
  });

  it('should settle a close() that overlaps the first one', async () => {
    events = [];
    const options = createRmqOptions();
    client = ClientProxyFactory.create({ transport: Transport.RMQ, options });
    await client.connect();
    const module = await Test.createTestingModule({
      controllers: [AcknowledgingController],
    }).compile();
    app = module.createNestMicroservice<MicroserviceOptions>({
      transport: Transport.RMQ,
      options: { ...options, noAck: false, gracefulShutdown: true },
    });
    await app.listen();

    const reply = firstValueFrom(
      client.send<string>('slow', 500).pipe(timeout(5000)),
    );
    const deadline = Date.now() + 5000;
    while (!events.includes('handler started')) {
      if (Date.now() > deadline) {
        throw new Error('The handler did not start');
      }
      await sleep(10);
    }

    const closed = Promise.all([app.close(), app.close()]).then(() => 'closed');

    await expect(
      Promise.race([closed, sleep(5000).then(() => 'still pending')]),
    ).resolves.toBe('closed');
    await expect(reply).resolves.toBe('reply');
  });
});
