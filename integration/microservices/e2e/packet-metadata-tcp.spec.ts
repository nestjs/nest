import { Controller, INestMicroservice, Module } from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  Ctx,
  EventPattern,
  MessagePattern,
  MicroserviceOptions,
  Payload,
  TcpContext,
  Transport,
} from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { firstValueFrom } from 'rxjs';

const PORT = 3791;

@Controller()
class MetadataController {
  static lastEventMetadata: Record<string, string> | undefined;
  static eventReceived: () => void = () => undefined;

  @MessagePattern('echo-metadata')
  echo(@Payload() data: unknown, @Ctx() context: TcpContext) {
    return { data, metadata: context.getMetadata() ?? null };
  }

  @EventPattern('record-metadata')
  record(@Ctx() context: TcpContext) {
    MetadataController.lastEventMetadata = context.getMetadata();
    MetadataController.eventReceived();
  }
}

@Module({ controllers: [MetadataController] })
class MetadataModule {}

/**
 * Packet metadata over a real TCP round trip: what a client's dispatch hook
 * attaches is what the handler's context returns, for requests and events
 * alike, and the payload arrives untouched.
 *
 * The unit specs cover each half in isolation. What they cannot show is that
 * the two halves agree on the wire - that the field survives the client's
 * serializer, the JSON socket framing and the server's deserializer.
 */
describe('Packet metadata (TCP)', () => {
  let app: INestMicroservice;
  let client: ClientProxy;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [MetadataModule],
    }).compile();

    app = module.createNestMicroservice<MicroserviceOptions>({
      transport: Transport.TCP,
      options: { host: '127.0.0.1', port: PORT },
    });
    await app.listen();

    client = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: { host: '127.0.0.1', port: PORT },
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
      client.send('echo-metadata', { orderId: 7 }),
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

    await firstValueFrom(client.emit('record-metadata', {}), {
      defaultValue: undefined,
    });
    await received;

    expect(MetadataController.lastEventMetadata).toEqual({
      'x-request-id': 'trace-2',
    });
  });

  it('leaves the context without metadata when no hook is set', async () => {
    const reply = await firstValueFrom(client.send('echo-metadata', 'plain'));

    expect(reply).toEqual({ data: 'plain', metadata: null });
  });

  it('calls the hook once per packet, with the pattern and the data', async () => {
    const seen: unknown[] = [];
    client.setOnDispatchHook(packet => {
      seen.push({ pattern: packet.pattern, data: packet.data });
    });

    await firstValueFrom(client.send('echo-metadata', 1));
    await firstValueFrom(client.send('echo-metadata', 2));

    expect(seen).toEqual([
      { pattern: 'echo-metadata', data: 1 },
      { pattern: 'echo-metadata', data: 2 },
    ]);
  });
});
