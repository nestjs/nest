import { Controller, INestMicroservice, Module } from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  Ctx,
  EventPattern,
  MessagePattern,
  MicroserviceOptions,
  Payload,
  RmqContext,
  RmqRecordBuilder,
  Transport,
} from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { firstValueFrom } from 'rxjs';

// The default matches integration/docker-compose.yml
const RMQ_URL = process.env.RMQ_URL ?? 'amqp://localhost:5672';
const QUEUE = 'packet_metadata';

@Controller()
class MetadataController {
  static lastEventMetadata: Record<string, string> | undefined;
  static eventReceived: () => void = () => undefined;

  @MessagePattern('echo-metadata')
  echo(@Payload() data: unknown, @Ctx() context: RmqContext) {
    return {
      data,
      metadata: context.getMetadata() ?? null,
      content: JSON.parse(context.getMessage().content.toString()),
    };
  }

  @EventPattern('record-metadata')
  record(@Ctx() context: RmqContext) {
    MetadataController.lastEventMetadata = context.getMetadata();
    MetadataController.eventReceived();
  }
}

@Module({ controllers: [MetadataController] })
class MetadataModule {}

/**
 * Packet metadata over RabbitMQ: what a client's dispatch hook attaches
 * travels in the message's `headers` property, which the handler's context
 * returns, while the message content stays what it was before.
 */
describe('Packet metadata (RabbitMQ)', () => {
  let app: INestMicroservice;
  let client: ClientProxy;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [MetadataModule],
    }).compile();

    // Durable, as RabbitMQ 4 refuses transient queues that are not exclusive
    const options = {
      urls: [RMQ_URL],
      queue: QUEUE,
      queueOptions: { durable: true },
    };
    app = module.createNestMicroservice<MicroserviceOptions>({
      transport: Transport.RMQ,
      options,
    });
    await app.listen();

    client = ClientProxyFactory.create({ transport: Transport.RMQ, options });
    await client.connect();
  });

  afterEach(async () => {
    await client?.close();
    await app?.close();
  });

  it('delivers what the dispatch hook attached to a request as headers, and not in the content', async () => {
    client.setOnDispatchHook(packet => {
      packet.metadata = { 'x-request-id': 'trace-1' };
    });

    const reply = await firstValueFrom(
      client.send('echo-metadata', { orderId: 7 }),
    );

    expect(reply.data).toEqual({ orderId: 7 });
    expect(reply.metadata).toEqual({ 'x-request-id': 'trace-1' });
    expect(reply.content).toEqual({
      pattern: 'echo-metadata',
      data: { orderId: 7 },
      id: expect.any(String),
    });
  });

  it('delivers it with an event as well', async () => {
    const received = new Promise<void>(resolve => {
      MetadataController.eventReceived = resolve;
    });
    client.setOnDispatchHook(packet => {
      packet.metadata = { 'x-request-id': 'trace-2' };
    });

    await firstValueFrom(client.emit('record-metadata', {}), {
      defaultValue: undefined,
    });
    await received;

    expect(MetadataController.lastEventMetadata).toEqual({
      'x-request-id': 'trace-2',
    });
  });

  it('lets a header set on the record win over metadata of the same name', async () => {
    client.setOnDispatchHook(packet => {
      packet.metadata = { 'x-request-id': 'trace-3', tenant: 'acme' };
    });

    const reply = await firstValueFrom(
      client.send(
        'echo-metadata',
        new RmqRecordBuilder({ orderId: 7 })
          .setOptions({ headers: { 'x-request-id': 'from-record' } })
          .build(),
      ),
    );

    expect(reply.metadata).toEqual({
      'x-request-id': 'from-record',
      tenant: 'acme',
    });
  });

  it('leaves the context without metadata when nothing set a header', async () => {
    const reply = await firstValueFrom(client.send('echo-metadata', 'plain'));

    expect(reply.metadata).toBeNull();
  });
});
