import { Controller, INestMicroservice, Module } from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  Ctx,
  EventPattern,
  MessagePattern,
  MicroserviceOptions,
  MqttContext,
  MqttRecordBuilder,
  Payload,
  Transport,
} from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { firstValueFrom } from 'rxjs';

// The default matches integration/docker-compose.yml
const MQTT_URL = process.env.MQTT_URL ?? 'mqtt://localhost:1883';

@Controller()
class MetadataController {
  static lastEventMetadata: Record<string, string> | undefined;
  static eventReceived: () => void = () => undefined;

  @MessagePattern('packet-metadata/echo')
  echo(@Payload() data: unknown, @Ctx() context: MqttContext) {
    return {
      data,
      metadata: context.getMetadata() ?? null,
      payload: JSON.parse(context.getPacket().payload.toString()),
    };
  }

  @EventPattern('packet-metadata/record')
  record(@Ctx() context: MqttContext) {
    MetadataController.lastEventMetadata = context.getMetadata();
    MetadataController.eventReceived();
  }
}

@Module({ controllers: [MetadataController] })
class MetadataModule {}

const setUp = (protocolVersion: 4 | 5) => {
  const context = {} as { app: INestMicroservice; client: ClientProxy };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [MetadataModule],
    }).compile();

    context.app = module.createNestMicroservice<MicroserviceOptions>({
      transport: Transport.MQTT,
      options: { url: MQTT_URL, protocolVersion },
    });
    await context.app.listen();

    context.client = ClientProxyFactory.create({
      transport: Transport.MQTT,
      options: { url: MQTT_URL, protocolVersion },
    });
    await context.client.connect();
  });

  afterEach(async () => {
    await context.client.close();
    await context.app.close();
  });

  return context;
};

/**
 * Packet metadata over MQTT 5: what a client's dispatch hook attaches
 * travels as user properties, which the handler's context returns, while the
 * payload stays what it was before.
 */
describe('Packet metadata (MQTT 5)', () => {
  const context = setUp(5);

  it('delivers what the dispatch hook attached to a request as user properties, and not in the payload', async () => {
    context.client.setOnDispatchHook(packet => {
      packet.metadata = { 'x-request-id': 'trace-1' };
    });

    const reply = await firstValueFrom(
      context.client.send('packet-metadata/echo', { orderId: 7 }),
    );

    expect(reply.data).toEqual({ orderId: 7 });
    expect(reply.metadata).toEqual({ 'x-request-id': 'trace-1' });
    expect(reply.payload).toEqual({
      pattern: 'packet-metadata/echo',
      data: { orderId: 7 },
      id: expect.any(String),
    });
  });

  it('delivers it with an event as well', async () => {
    const received = new Promise<void>(resolve => {
      MetadataController.eventReceived = resolve;
    });
    context.client.setOnDispatchHook(packet => {
      packet.metadata = { 'x-request-id': 'trace-2' };
    });

    await firstValueFrom(context.client.emit('packet-metadata/record', {}), {
      defaultValue: undefined,
    });
    await received;

    expect(MetadataController.lastEventMetadata).toEqual({
      'x-request-id': 'trace-2',
    });
  });

  it('lets a user property set on the record win over metadata of the same name', async () => {
    context.client.setOnDispatchHook(packet => {
      packet.metadata = { 'x-request-id': 'trace-3', tenant: 'acme' };
    });

    const reply = await firstValueFrom(
      context.client.send(
        'packet-metadata/echo',
        new MqttRecordBuilder({ orderId: 7 })
          .setProperties({ userProperties: { 'x-request-id': 'from-record' } })
          .build(),
      ),
    );

    expect(reply.metadata).toEqual({
      'x-request-id': 'from-record',
      tenant: 'acme',
    });
  });
});

/**
 * MQTT 3 has no user properties: the metadata does not travel, and the call
 * goes through as it did before metadata existed.
 */
describe('Packet metadata (MQTT 3.1.1)', () => {
  const context = setUp(4);

  it('completes the call without the metadata, and keeps it out of the payload', async () => {
    context.client.setOnDispatchHook(packet => {
      packet.metadata = { 'x-request-id': 'trace-4' };
    });

    const reply = await firstValueFrom(
      context.client.send('packet-metadata/echo', { orderId: 7 }),
    );

    expect(reply).toEqual({
      data: { orderId: 7 },
      metadata: null,
      payload: {
        pattern: 'packet-metadata/echo',
        data: { orderId: 7 },
        id: expect.any(String),
      },
    });
  });
});
