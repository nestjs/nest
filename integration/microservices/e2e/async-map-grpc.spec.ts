import * as GRPC from '@grpc/grpc-js';
import * as ProtoLoader from '@grpc/proto-loader';
import { INestMicroservice } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { join } from 'path';
import { AsyncMapController } from '../src/grpc-async-map/async-map.controller.js';

const URL = 'localhost:5013';
const PROTO_PATH = join(
  import.meta.dirname,
  '../src/grpc-async-map/async-map.proto',
);

describe('GRPC transport (interceptor that maps to an async function)', () => {
  let app: INestMicroservice;
  let client: any;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AsyncMapController],
    }).compile();

    app = module.createNestMicroservice<MicroserviceOptions>({
      transport: Transport.GRPC,
      options: { package: 'asyncmap', protoPath: PROTO_PATH, url: URL },
    });
    await app.listen();

    const proto = GRPC.loadPackageDefinition(
      ProtoLoader.loadSync(PROTO_PATH),
    ) as any;
    client = new proto.asyncmap.AsyncMap(
      URL,
      GRPC.credentials.createInsecure(),
    );
  });

  afterAll(async () => {
    client.close();
    await app.close();
  });

  const deadline = () => Date.now() + 2000;

  const readAll = (call: any) =>
    new Promise<{ messages: any[]; error?: any }>(resolve => {
      const messages: any[] = [];
      call.on('data', (message: any) => messages.push(message));
      call.on('error', (error: any) => resolve({ messages, error }));
      call.on('end', () => resolve({ messages }));
    });

  it('should send the resolved messages on unary, server and bidi streaming calls', async () => {
    const unary = await new Promise<any>((resolve, reject) =>
      client.unary({ n: 5 }, { deadline: deadline() }, (err: any, res: any) =>
        err ? reject(err) : resolve(res),
      ),
    );
    const streamed = await readAll(
      client.serverStream({ n: 2, label: 'stream' }, { deadline: deadline() }),
    );
    const echo = client.echo({ deadline: deadline() });
    const echoed = readAll(echo);
    echo.write({ n: 4 });
    echo.write({ n: 5 });
    echo.end();

    expect(unary).toEqual({ n: 5, label: 'unary!' });
    expect(streamed).toEqual({
      messages: [
        { n: 1, label: 'stream!' },
        { n: 2, label: 'stream!' },
      ],
    });
    expect(await echoed).toEqual({
      messages: [
        { n: 4, label: 'echo!' },
        { n: 5, label: 'echo!' },
      ],
    });
  });

  it('should fail a server stream whose async function rejects', async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => unhandled.push(reason);
    process.on('unhandledRejection', onUnhandled);
    try {
      const { messages, error } = await readAll(
        client.serverStream(
          { n: 1, label: 'stream', reject: true },
          { deadline: deadline() },
        ),
      );
      await new Promise(resolve => setImmediate(resolve));

      expect(messages).toEqual([]);
      expect(error?.code).toBe(GRPC.status.INTERNAL);
      expect(unhandled).toEqual([]);
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }
  });
});
