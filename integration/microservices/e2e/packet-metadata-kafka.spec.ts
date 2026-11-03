import { Controller, INestMicroservice, Module } from '@nestjs/common';
import {
  ClientKafka,
  ClientProxyFactory,
  Ctx,
  EventPattern,
  KafkaContext,
  MessagePattern,
  MicroserviceOptions,
  Payload,
  Transport,
} from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { firstValueFrom } from 'rxjs';

// The default matches integration/docker-compose.yml
const KAFKA_BROKER = process.env.KAFKA_BROKER ?? 'localhost:9092';
const ECHO = 'packet-metadata.echo';
const RECORD = 'packet-metadata.record';

@Controller()
class MetadataController {
  static recorded: (Record<string, string> | undefined)[] = [];
  static onRecorded: () => void = () => undefined;

  @MessagePattern(ECHO)
  echo(@Payload() data: unknown, @Ctx() context: KafkaContext) {
    return { data, metadata: context.getMetadata() ?? null };
  }

  @EventPattern(RECORD)
  record(@Ctx() context: KafkaContext) {
    MetadataController.recorded.push(context.getMetadata());
    MetadataController.onRecorded();
  }
}

@Module({ controllers: [MetadataController] })
class MetadataModule {}

const waitForRecords = (count: number) =>
  new Promise<void>(resolve => {
    MetadataController.onRecorded = () => {
      if (MetadataController.recorded.length >= count) {
        resolve();
      }
    };
  });

/**
 * Packet metadata over Kafka: what a client's dispatch hook attaches travels
 * as record headers, which the handler's context returns as they arrived.
 *
 * Skip this flaky test in CI/CD pipeline as it frequently
 * fails to connect to Kafka container in the cloud.
 */
describe.skip('Packet metadata (Kafka)', () => {
  let app: INestMicroservice;
  let client: ClientKafka;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [MetadataModule],
    }).compile();

    app = module.createNestMicroservice<MicroserviceOptions>({
      transport: Transport.KAFKA,
      options: {
        client: { brokers: [KAFKA_BROKER] },
        consumer: { groupId: 'packet-metadata-server' },
      },
    });
    await app.listen();

    client = ClientProxyFactory.create({
      transport: Transport.KAFKA,
      options: {
        client: { brokers: [KAFKA_BROKER] },
        consumer: { groupId: 'packet-metadata-client' },
      },
    }) as ClientKafka;
    client.subscribeToResponseOf(ECHO);
    await client.connect();
  }, 60_000);

  afterAll(async () => {
    await client.close();
    await app.close();
  });

  beforeEach(() => {
    MetadataController.recorded = [];
    client.setOnDispatchHook(() => undefined);
  });

  it('delivers what the dispatch hook attached to a request as record headers', async () => {
    client.setOnDispatchHook(packet => {
      packet.metadata = { 'x-request-id': 'trace-1' };
    });

    const reply = await firstValueFrom(client.send(ECHO, { orderId: 7 }));

    expect(reply.data).toEqual({ orderId: 7 });
    expect(reply.metadata).toMatchObject({ 'x-request-id': 'trace-1' });
  });

  it('lets a header set on the message win over metadata of the same name', async () => {
    client.setOnDispatchHook(packet => {
      packet.metadata = { 'x-request-id': 'trace-2', tenant: 'acme' };
    });

    const reply = await firstValueFrom(
      client.send(ECHO, {
        key: 'order-7',
        value: { orderId: 7 },
        headers: { 'x-request-id': 'from-message' },
      }),
    );

    expect(reply.metadata).toMatchObject({
      'x-request-id': 'from-message',
      tenant: 'acme',
    });
  });

  it('delivers it with an event, and with every message of a batch', async () => {
    const recorded = waitForRecords(3);
    client.setOnDispatchHook(packet => {
      packet.metadata = { 'x-request-id': 'trace-3' };
    });

    await firstValueFrom(client.emit(RECORD, { orderId: 7 }), {
      defaultValue: undefined,
    });
    await firstValueFrom(
      client.emitBatch(RECORD, {
        messages: [{ value: 'a' }, { value: 'b' }],
      }),
      { defaultValue: undefined },
    );
    await recorded;

    expect(MetadataController.recorded).toEqual([
      { 'x-request-id': 'trace-3' },
      { 'x-request-id': 'trace-3' },
      { 'x-request-id': 'trace-3' },
    ]);
  });

  it('leaves the context without metadata for an event without headers', async () => {
    const recorded = waitForRecords(1);

    await firstValueFrom(client.emit(RECORD, { orderId: 8 }), {
      defaultValue: undefined,
    });
    await recorded;

    expect(MetadataController.recorded).toEqual([undefined]);
  });
});
