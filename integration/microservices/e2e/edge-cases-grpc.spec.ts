import * as GRPC from '@grpc/grpc-js';
import * as ProtoLoader from '@grpc/proto-loader';
import { INestMicroservice } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { join } from 'path';
import { EdgeController } from '../src/grpc-edge/edge.controller.js';

const URL = 'localhost:5012';
const PROTO_PATH = join(import.meta.dirname, '../src/grpc-edge/edge.proto');

describe('GRPC transport (handlers that complete empty or throw)', () => {
  let app: INestMicroservice;
  let client: any;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [EdgeController],
    }).compile();

    app = module.createNestMicroservice<MicroserviceOptions>({
      transport: Transport.GRPC,
      options: { package: 'edge', protoPath: PROTO_PATH, url: URL },
    });
    await app.listen();

    const proto = GRPC.loadPackageDefinition(
      ProtoLoader.loadSync(PROTO_PATH),
    ) as any;
    client = new proto.edge.Edge(URL, GRPC.credentials.createInsecure());
  });

  afterAll(async () => {
    client.close();
    await app.close();
  });

  const deadline = () => Date.now() + 2000;

  const unary = (method: string, request: object) =>
    new Promise<{ err: any; res: any }>(resolve =>
      client[method](request, { deadline: deadline() }, (err, res) =>
        resolve({ err, res }),
      ),
    );

  const clientStream = (method: string, requests: object[]) =>
    new Promise<{ err: any; res: any }>(resolve => {
      const call = client[method]({ deadline: deadline() }, (err, res) =>
        resolve({ err, res }),
      );
      requests.forEach(request => call.write(request));
      call.end();
    });

  it('fails a unary call whose handler completes without a response', async () => {
    const { err } = await unary('completeEmpty', { value: 1 });

    expect(err?.code).toBe(GRPC.status.INTERNAL);
  });

  it('fails a client-streaming call whose handler completes without a response', async () => {
    const { err } = await clientStream('collectEmpty', [{ value: 1 }]);

    expect(err?.code).toBe(GRPC.status.INTERNAL);
  });

  it('sends the error of a throwing bidi stream call to the client', async () => {
    const call = client.echoThrow({ deadline: deadline() });
    const err = await new Promise<any>(resolve => {
      call.on('error', resolve);
      call.on('data', () => undefined);
      call.write({ value: 1 });
    });

    expect(err.code).toBe(GRPC.status.INVALID_ARGUMENT);
    expect(err.details).toBe('echo rejected');
  });

  it('sends the error of a throwing client-streaming stream call to the client', async () => {
    const { err } = await clientStream('collectThrow', [{ value: 1 }]);

    expect(err?.code).toBe(GRPC.status.INVALID_ARGUMENT);
    expect(err?.details).toBe('collect rejected');
  });
});
