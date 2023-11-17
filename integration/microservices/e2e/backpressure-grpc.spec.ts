import * as GRPC from '@grpc/grpc-js';
import * as ProtoLoader from '@grpc/proto-loader';
import { INestApplication } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { fail } from 'assert';
import { expect } from 'chai';
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

    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.GRPC,
      options: {
        package: ['backpressure'],
        protoPath: [join(__dirname, '../src/grpc/backpressure.proto')],
      },
    });

    // Start gRPC microservice
    await app.startAllMicroservices();
    await app.init();

    // Load proto-buffers for test gRPC dispatch
    const proto = ProtoLoader.loadSync(
      join(__dirname, '../src/grpc/backpressure.proto'),
    );

    // Create Raw gRPC client object
    const protoGRPC = GRPC.loadPackageDefinition(proto) as any;

    client = new protoGRPC.backpressure.Backpressure(
      'localhost:5000',
      GRPC.credentials.createInsecure(),
    );
  });

  it(`GRPC with backpressure control`, async function () {
    // This test hit the gRPC server with 1000 messages, but the server
    // has to process large (> 1MB) messages, so it will definitely hit
    // issues where writing to the stream needs to be paused until a drain
    // event. Prior to this test, a bug existed where the server would
    // send the incorrect number of messages due to improper backpressure
    // handling that wrote messages more than once.
    this.timeout(10000);

    const largeMessages = client.streamLargeMessages();
    // [0, 1, 2, ..., 999]
    const expectedIds = Array.from({ length: 1000 }, (_, n) => n);
    const receivedIds: number[] = [];

    await largeMessages.forEach(msg => {
      receivedIds.push(msg.id);
    });

    expect(receivedIds).to.deep.equal(expectedIds);
  });
});
