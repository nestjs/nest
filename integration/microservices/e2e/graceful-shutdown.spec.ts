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
  MessagePattern,
  MicroserviceOptions,
  Transport,
} from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { firstValueFrom, timeout } from 'rxjs';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
] as const)(
  '$name transport (graceful shutdown)',
  ({ transport, connection }) => {
    let events: string[];
    let app: INestMicroservice | undefined;
    let client: ClientProxy;

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
      return app;
    }

    function send(id: number, duration: number, waitFor = 5000) {
      return firstValueFrom(
        client.send<string>('slow', { id, duration }).pipe(timeout(waitFor)),
      );
    }

    beforeEach(async () => {
      events = [];
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
      await sleep(100);

      await server.close();

      expect(events).toEqual(['handler 1 started', 'shutdown hook']);
      await expect(reply).resolves.toBe('TimeoutError');
    });

    it('should let a handler in flight reply before the shutdown hooks run', async () => {
      const server = await createServer({ gracefulShutdown: true });
      const reply = send(1, 500);
      await sleep(100);

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
      await sleep(100);

      const closeCalledAt = Date.now();
      await server.close();

      expect(Date.now() - closeCalledAt).toBeLessThan(5000);
      await expect(reply).resolves.toBe('reply 1');
    });

    it('should take no new request while it is closing', async () => {
      const server = await createServer({ gracefulShutdown: true });
      const first = send(1, 500);
      await sleep(100);

      const closing = server.close();
      await sleep(100);
      // Redis leaves the request unanswered, NATS rejects it for lack of a
      // subscriber. Either way it must not reach the server that is closing.
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
      await sleep(100);

      const closeCalledAt = Date.now();
      await server.close();

      expect(Date.now() - closeCalledAt).toBeLessThan(2000);
      expect(events).toEqual(['handler 1 started', 'shutdown hook']);
    });
  },
);
