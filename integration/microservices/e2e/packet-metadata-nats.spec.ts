import { headers as natsHeaders } from '@nats-io/transport-node';
import { Controller, INestMicroservice, Module } from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  Ctx,
  EventPattern,
  MessagePattern,
  MicroserviceOptions,
  NatsContext,
  NatsRecordBuilder,
  Payload,
  Transport,
} from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { firstValueFrom } from 'rxjs';

// The default matches integration/docker-compose.yml
const NATS_URL = process.env.NATS_URL ?? 'nats://localhost:4222';

@Controller()
class MetadataController {
  static lastEventMetadata: Record<string, string> | undefined;
  static eventReceived: () => void = () => undefined;

  @MessagePattern('packet-metadata.echo')
  echo(@Payload() data: unknown, @Ctx() context: NatsContext) {
    return { data, metadata: context.getMetadata() ?? null };
  }

  @EventPattern('packet-metadata.record')
  record(@Ctx() context: NatsContext) {
    MetadataController.lastEventMetadata = context.getMetadata();
    MetadataController.eventReceived();
  }
}

@Module({ controllers: [MetadataController] })
class MetadataModule {}

/**
 * Packet metadata over NATS: what a client's dispatch hook attaches travels
 * as message headers, which the handler's context returns, while the payload
 * stays what it was before metadata existed.
 */
describe('Packet metadata (NATS)', () => {
  let app: INestMicroservice;
  let client: ClientProxy;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [MetadataModule],
    }).compile();

    app = module.createNestMicroservice<MicroserviceOptions>({
      transport: Transport.NATS,
      options: { servers: NATS_URL },
    });
    await app.listen();

    client = ClientProxyFactory.create({
      transport: Transport.NATS,
      options: { servers: NATS_URL },
    });
    await client.connect();
  });

  afterEach(async () => {
    await client.close();
    await app.close();
  });

  it('delivers what the dispatch hook attached to a request, beside the payload', async () => {
    client.setOnDispatchHook(packet => {
      packet.metadata = { 'x-request-id': 'trace-1' };
    });

    const reply = await firstValueFrom(
      client.send('packet-metadata.echo', { orderId: 7 }),
    );

    expect(reply).toEqual({
      data: { orderId: 7 },
      metadata: { 'x-request-id': 'trace-1' },
    });
  });

  it('delivers it with an event as well', async () => {
    const received = new Promise<void>(resolve => {
      MetadataController.eventReceived = resolve;
    });
    client.setOnDispatchHook(packet => {
      packet.metadata = { 'x-request-id': 'trace-2' };
    });

    await firstValueFrom(client.emit('packet-metadata.record', {}), {
      defaultValue: undefined,
    });
    await received;

    expect(MetadataController.lastEventMetadata).toEqual({
      'x-request-id': 'trace-2',
    });
  });

  it('sends it as plain message headers, and not in the payload', async () => {
    const connection = client.unwrap<any>();
    const subscription = connection.subscribe('packet-metadata.raw', {
      max: 1,
    });
    client.setOnDispatchHook(packet => {
      packet.metadata = { 'x-request-id': 'trace-3' };
    });

    await firstValueFrom(client.emit('packet-metadata.raw', { orderId: 7 }), {
      defaultValue: undefined,
    });
    let message: any;
    for await (const received of subscription) {
      message = received;
    }

    expect(message.headers.get('x-request-id')).toBe('trace-3');
    expect(JSON.parse(message.string())).toEqual({
      pattern: 'packet-metadata.raw',
      data: { orderId: 7 },
    });
  });

  it('lets a header set on the record win over metadata of the same name', async () => {
    const headers = natsHeaders();
    headers.set('x-request-id', 'from-record');
    client.setOnDispatchHook(packet => {
      packet.metadata = { 'x-request-id': 'trace-4', tenant: 'acme' };
    });

    const reply = await firstValueFrom(
      client.send(
        'packet-metadata.echo',
        new NatsRecordBuilder({ orderId: 7 }).setHeaders(headers).build(),
      ),
    );

    expect(reply.metadata).toEqual({
      'x-request-id': 'from-record',
      tenant: 'acme',
    });
  });

  it('leaves the context without metadata when nothing set a header', async () => {
    const reply = await firstValueFrom(
      client.send('packet-metadata.echo', 'plain'),
    );

    expect(reply).toEqual({ data: 'plain', metadata: null });
  });
});
