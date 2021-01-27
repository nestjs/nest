import * as ProtoLoader from '@grpc/proto-loader';
import { INestApplication } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { fail } from 'assert';
import { expect } from 'chai';
import * as GRPC from '@grpc/grpc-js';
import { join } from 'path';
import * as request from 'supertest';
import { GrpcController } from '../src/grpc/grpc.controller';

describe('GRPC transport', () => {
  let server;
  let app: INestApplication;
  let client: any;

  before(async () => {
    const module = await Test.createTestingModule({
      controllers: [GrpcController],
    }).compile();

    app = module.createNestApplication();
    server = app.getHttpAdapter().getInstance();

    app.connectMicroservice({
      transport: Transport.GRPC,
      options: {
        package: ['math', 'math2'],
        protoPath: [
          join(__dirname, '../src/grpc/math.proto'),
          join(__dirname, '../src/grpc/math2.proto'),
        ],
      },
    });
    // Start gRPC microservice
    await app.startAllMicroservicesAsync();
    await app.init();
    // Load proto-buffers for test gRPC dispatch
    const proto = ProtoLoader.loadSync(
      join(__dirname, '../src/grpc/math.proto'),
    ) as any;
    // Create Raw gRPC client object
    const protoGRPC = GRPC.loadPackageDefinition(proto) as any;
    // Create client connected to started services at standard 5000 port
    client = new protoGRPC.math.Math(
      'localhost:5000',
      GRPC.credentials.createInsecure(),
    );
  });

  it(`GRPC Sending and Receiving HTTP POST`, () => {
    return request(server)
      .post('/sum')
      .send([1, 2, 3, 4, 5])
      .expect(200, { result: 15 });
  });

  it(`GRPC Sending and Receiving HTTP POST (multiple proto)`, async () => {
    await request(server)
      .post('/multi/sum')
      .send([1, 2, 3, 4, 5])
      .expect(200, { result: 15 });

    await request(server)
      .post('/multi/sum2')
      .send([1, 2, 3, 4, 5])
      .expect(200, { result: 15 });
  });

  it('GRPC Sending and receiving Stream from RX handler', async () => {
    const callHandler = client.SumStream();

    callHandler.on('data', (msg: number) => {
      expect(msg).to.eql({ result: 15 });
      callHandler.cancel();
    });

    callHandler.on('error', (err: any) => {
      // We want to fail only on real errors while Cancellation error
      // is expected
      if (String(err).toLowerCase().indexOf('cancelled') === -1) {
        fail('gRPC Stream error happened, error: ' + err);
      }
    });

    return new Promise((resolve, reject) => {
      callHandler.write({ data: [1, 2, 3, 4, 5] });
      setTimeout(() => resolve(), 1000);
    });
  });

  it('GRPC Sending and receiving Stream from Call Passthrough handler', async () => {
    const callHandler = client.SumStreamPass();

    callHandler.on('data', (msg: number) => {
      expect(msg).to.eql({ result: 15 });
      callHandler.cancel();
    });

    callHandler.on('error', (err: any) => {
      // We want to fail only on real errors while Cancellation error
      // is expected
      if (String(err).toLowerCase().indexOf('cancelled') === -1) {
        fail('gRPC Stream error happened, error: ' + err);
      }
    });

    return new Promise((resolve, reject) => {
      callHandler.write({ data: [1, 2, 3, 4, 5] });
      setTimeout(() => resolve(), 1000);
    });
  });

  after(async () => {
    await app.close();
    client.close();
  });
});
