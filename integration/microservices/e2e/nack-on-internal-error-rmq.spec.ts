import {
  Controller,
  INestMicroservice,
  Module,
  StandardSchemaValidationPipe,
} from '@nestjs/common';
import {
  Ctx,
  EventPattern,
  MicroserviceOptions,
  Payload,
  RmqContext,
  RpcException,
  Transport,
} from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import * as amqplib from 'amqplib';

// The default matches integration/docker-compose.yml
const RMQ_URL = process.env.RMQ_URL ?? 'amqp://localhost:5672';
const QUEUE = 'nack_on_internal_error';
const DEAD_LETTERS = 'nack_on_internal_error_dead_letters';

// Requires a string "id", as `z.object({ id: z.string() })` does
const idSchema: StandardSchemaV1<unknown, { id: string }> = {
  '~standard': {
    version: 1,
    vendor: 'test',
    validate: (value: any) =>
      typeof value?.id === 'string'
        ? { value }
        : { issues: [{ message: 'id must be a string' }] },
  },
};

@Controller()
class FailingController {
  @EventPattern('internal-error')
  internalError() {
    throw new Error('handler failed');
  }

  @EventPattern('rpc-exception')
  rpcException() {
    throw new RpcException('not found');
  }

  @EventPattern('validated')
  validated(@Payload({ schema: idSchema }) data: { id: string }) {}

  @EventPattern('acked-internal-error')
  ackedInternalError(@Ctx() context: RmqContext) {
    context.getChannelRef().ack(context.getMessage());
    throw new Error('handler failed after the ack');
  }
}

@Module({ controllers: [FailingController] })
class FailingModule {}

describe('RMQ nackOnInternalError', () => {
  let connection: amqplib.ChannelModel;
  let channel: amqplib.Channel;
  let app: INestMicroservice;

  const publish = (pattern: string) =>
    channel.sendToQueue(
      QUEUE,
      Buffer.from(JSON.stringify({ pattern, data: {} })),
    );
  const count = async (queue: string) =>
    (await channel.checkQueue(queue)).messageCount;
  const waitForCount = async (queue: string, expected: number) => {
    const deadline = Date.now() + 5_000;
    while ((await count(queue)) !== expected && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    expect(await count(queue)).toBe(expected);
  };

  beforeEach(async () => {
    connection = await amqplib.connect(RMQ_URL);
    channel = await connection.createChannel();
    await channel.deleteQueue(QUEUE);
    await channel.deleteQueue(DEAD_LETTERS);
    await channel.assertQueue(DEAD_LETTERS, { durable: true });

    const module = await Test.createTestingModule({
      imports: [FailingModule],
    }).compile();
    app = module.createNestMicroservice<MicroserviceOptions>({
      transport: Transport.RMQ,
      options: {
        urls: [RMQ_URL],
        queue: QUEUE,
        queueOptions: {
          durable: true,
          arguments: {
            'x-dead-letter-exchange': '',
            'x-dead-letter-routing-key': DEAD_LETTERS,
          },
        },
        noAck: false,
        nackOnInternalError: true,
      },
    });
    app.useGlobalPipes(new StandardSchemaValidationPipe());
    await app.listen();
  });

  afterEach(async () => {
    await app.close();
    await channel.deleteQueue(QUEUE);
    await channel.deleteQueue(DEAD_LETTERS);
    await connection.close();
  });

  it('dead-letters the events that fail with an internal error, including a rejected payload, and not one that fails with an RpcException', async () => {
    publish('rpc-exception');
    publish('internal-error');
    publish('validated');

    await waitForCount(DEAD_LETTERS, 2);
    await app.close();
    // The broker returns the unacknowledged "rpc-exception" event
    await waitForCount(QUEUE, 1);
  });

  it('does not nack a message acknowledged already, which would stop the consumer', async () => {
    publish('acked-internal-error');
    await waitForCount(QUEUE, 0);
    // Long enough for the broker to close the channel of a second settlement
    await new Promise(resolve => setTimeout(resolve, 300));

    expect((await channel.checkQueue(QUEUE)).consumerCount).toBe(1);
    expect(await count(DEAD_LETTERS)).toBe(0);
  });
});
