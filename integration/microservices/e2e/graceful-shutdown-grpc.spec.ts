import * as GRPC from '@grpc/grpc-js';
import * as ProtoLoader from '@grpc/proto-loader';
import { Controller, INestMicroservice } from '@nestjs/common';
import {
  GrpcMethod,
  MicroserviceOptions,
  Transport,
} from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { join } from 'path';
import { timer } from 'rxjs';
import { map, take } from 'rxjs/operators';

const URL = 'localhost:5014';
const PROTO_PATH = join(
  import.meta.dirname,
  '../src/grpc-async-map/async-map.proto',
);

@Controller()
class StreamController {
  // Streams "n" items, the first one at once and the others 100 ms apart
  @GrpcMethod('AsyncMap')
  serverStream({ n }: { n: number }) {
    return timer(0, 100).pipe(
      take(n),
      map(index => ({ n: index + 1, label: 'item' })),
    );
  }
}

interface CallResult {
  items: number;
  error?: GRPC.ServiceError;
  status?: GRPC.StatusObject;
}

describe('GRPC transport (graceful shutdown)', () => {
  let app: INestMicroservice | undefined;
  let client: any;
  let calls: GRPC.ClientReadableStream<unknown>[];

  async function createServer(options: Record<string, unknown>) {
    const module = await Test.createTestingModule({
      controllers: [StreamController],
    }).compile();

    app = module.createNestMicroservice<MicroserviceOptions>({
      transport: Transport.GRPC,
      options: {
        package: 'asyncmap',
        protoPath: PROTO_PATH,
        url: URL,
        ...options,
      },
    });
    await app.listen();
    return app;
  }

  // "started" resolves once the first item has arrived, so the server must
  // be closed while the handler runs, "ended" with how the call ended
  function startStream(n: number) {
    const call = client.serverStream(
      { n },
      { deadline: Date.now() + 10_000 },
    ) as GRPC.ClientReadableStream<unknown>;
    calls.push(call);
    let items = 0;
    const started = new Promise<void>((resolve, reject) => {
      call.once('data', () => resolve());
      call.once('error', reject);
    });
    const ended = new Promise<CallResult>(resolve => {
      let status: GRPC.StatusObject | undefined;
      call.on('data', () => items++);
      call.on('status', value => (status = value));
      call.on('error', (error: GRPC.ServiceError) => resolve({ items, error }));
      call.on('end', () => resolve({ items, status }));
    });
    return { started, ended };
  }

  beforeEach(() => {
    calls = [];
    const proto = GRPC.loadPackageDefinition(
      ProtoLoader.loadSync(PROTO_PATH),
    ) as any;
    client = new proto.asyncmap.AsyncMap(
      URL,
      GRPC.credentials.createInsecure(),
    );
  });

  afterEach(async () => {
    calls.forEach(call => call.cancel());
    client.close();
    await app?.close();
    app = undefined;
  });

  it('should cancel a call still running once "gracePeriod" is over', async () => {
    const server = await createServer({
      gracefulShutdown: true,
      gracePeriod: 500,
    });
    // About 5 seconds, well past "gracePeriod"
    const { started, ended } = startStream(50);
    await started;

    const closeCalledAt = Date.now();
    await server.close();
    const elapsed = Date.now() - closeCalledAt;

    // It waits for the call first, rather than cancelling it at once
    expect(elapsed).toBeGreaterThanOrEqual(400);
    expect(elapsed).toBeLessThan(3000);
    const { items, error } = await ended;
    expect(items).toBeLessThan(50);
    // grpc-js reports CANCELLED when the call is reset before the connection
    // drops, UNAVAILABLE when the connection drops first
    expect([GRPC.status.CANCELLED, GRPC.status.UNAVAILABLE]).toContain(
      error?.code,
    );
  });

  it('should let a call in progress finish, well before "gracePeriod"', async () => {
    const server = await createServer({
      gracefulShutdown: true,
      gracePeriod: 30_000,
    });
    const { started, ended } = startStream(3);
    await started;

    const closeCalledAt = Date.now();
    await server.close();

    expect(Date.now() - closeCalledAt).toBeLessThan(5000);
    const { items, error, status } = await ended;
    expect(error).toBeUndefined();
    expect(status?.code).toBe(GRPC.status.OK);
    expect(items).toBe(3);
  });
});
