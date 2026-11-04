import { Metadata } from '@grpc/grpc-js';
import { Controller, INestMicroservice, Module } from '@nestjs/common';
import {
  ClientGrpcProxy,
  ClientProxyFactory,
  GrpcMethod,
  ServerGrpc,
  Transport,
} from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { join } from 'path';
import { firstValueFrom, from, lastValueFrom, toArray } from 'rxjs';

const URL = 'localhost:3792';
const grpcOptions = {
  package: 'math',
  protoPath: join(import.meta.dirname, '../src/grpc/math.proto'),
  url: URL,
};

@Controller()
class MathController {
  static received: Record<string, unknown>[] = [];

  @GrpcMethod('Math', 'Sum')
  sum({ data }: { data: number[] }, metadata: Metadata) {
    MathController.received.push(metadata.getMap());
    return { result: data.reduce((total, value) => total + value, 0) };
  }

  @GrpcMethod('Math', 'StreamDivide')
  streamDivide(
    { data }: { data: { dividend: number; divisor: number }[] },
    metadata: Metadata,
  ) {
    MathController.received.push(metadata.getMap());
    return from(
      data.map(({ dividend, divisor }) => ({
        data: { result: dividend / divisor },
      })),
    );
  }
}

@Module({ controllers: [MathController] })
class MathModule {}

/**
 * Packet metadata over gRPC: what a client's dispatch hook attaches travels
 * as call metadata, which the handler reads as it reads any other, and which
 * the processing hooks read through the context's `getMetadata()`.
 */
describe('Packet metadata (gRPC)', () => {
  let app: INestMicroservice;
  let client: ClientGrpcProxy;
  let math: any;
  let processed: (Record<string, string> | undefined)[];

  beforeEach(async () => {
    MathController.received = [];
    processed = [];
    const server = new ServerGrpc(grpcOptions);
    server.setOnProcessingStartHook((_transportId, context: any, done) => {
      processed.push(context.getMetadata());
      return done();
    });

    const module = await Test.createTestingModule({
      imports: [MathModule],
    }).compile();
    app = module.createNestMicroservice({ strategy: server });
    await app.listen();

    client = ClientProxyFactory.create({
      transport: Transport.GRPC,
      options: grpcOptions,
    }) as ClientGrpcProxy;
    math = client.getService('Math');
  });

  afterEach(async () => {
    client.close();
    await app.close();
  });

  it('delivers what the dispatch hook attached as call metadata', async () => {
    client.setOnDispatchHook(packet => {
      packet.metadata = { 'x-request-id': 'trace-1' };
    });

    const reply = await firstValueFrom(math.sum({ data: [1, 2, 3] }));

    expect(reply).toEqual({ result: 6 });
    expect(MathController.received[0]).toMatchObject({
      'x-request-id': 'trace-1',
    });
    expect(processed[0]).toMatchObject({ 'x-request-id': 'trace-1' });
  });

  it('runs the hook for every call, a response stream included', async () => {
    let calls = 0;
    client.setOnDispatchHook(packet => {
      packet.metadata = { 'x-request-id': `trace-${++calls}` };
    });

    await firstValueFrom(math.sum({ data: [1] }));
    const results = await lastValueFrom(
      math
        .streamDivide({ data: [{ dividend: 6, divisor: 3 }] })
        .pipe(toArray()),
    );

    expect(results).toEqual([{ data: { result: 2 } }]);
    expect(
      MathController.received.map(metadata => metadata['x-request-id']),
    ).toEqual(['trace-1', 'trace-2']);
  });

  it("lets the caller's own metadata win, and leaves the caller's Metadata as it was", async () => {
    client.setOnDispatchHook(packet => {
      packet.metadata = { 'x-request-id': 'trace-3', tenant: 'acme' };
    });
    const metadata = new Metadata();
    metadata.set('x-request-id', 'from-caller');

    await firstValueFrom(math.sum({ data: [1, 2] }, metadata));

    expect(MathController.received[0]).toMatchObject({
      'x-request-id': 'from-caller',
      tenant: 'acme',
    });
    expect(metadata.getMap()).toEqual({ 'x-request-id': 'from-caller' });
  });

  it('adds nothing when no hook is set', async () => {
    await firstValueFrom(math.sum({ data: [1, 2] }));

    expect(MathController.received[0]).not.toHaveProperty('x-request-id');
    expect(processed[0]).not.toHaveProperty('x-request-id');
  });
});
