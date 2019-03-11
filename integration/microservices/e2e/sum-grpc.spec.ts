import { INestApplication } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import * as express from 'express';
import { join } from 'path';
import * as request from 'supertest';
import { GrpcController } from '../src/grpc/grpc.controller';
import * as ProtoLoader from '@grpc/proto-loader';
import * as GRPC from 'grpc';
import { expect } from 'chai';
import { fail } from 'assert';

describe('GRPC transport', () => {
  let server;
  let app: INestApplication;
  let client: any;

  before(async () => {
    const module = await Test.createTestingModule({
      controllers: [GrpcController],
    }).compile();
    // Create gRPC + HTTP server
    server = express();
    app = module.createNestApplication(server);
    app.connectMicroservice({
      transport: Transport.GRPC,
      options: {
        package: 'math',
        protoPath: join(__dirname, '../src/grpc/math.proto'),
      },
    });
    // Start gRPC microservice
    await app.startAllMicroservicesAsync();
    await app.init();
    // Load proto-buffers for test gRPC dispatch
    const proto = ProtoLoader
      .loadSync(join(__dirname, '../src/grpc/math.proto')) as any;
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
      .post('/')
      .send([1, 2, 3, 4, 5])
      .expect(200, { result: 15 });
  });

  it('GRPC Sending and receiving Stream from RX handler', async () => {

    const callHandler = client.SumStream();

    callHandler.on('data', (msg: number) => {
      // Do deep comparison (to.eql)
      expect(msg).to.eql({result: 15});
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
      callHandler.write({data: [1, 2, 3, 4, 5]});
      setTimeout(() => resolve(), 1000);
    });

  });

  it('GRPC Sending and receiving Stream from Call Passthrough handler', async () => {

    const callHandler = client.SumStreamPass();

    callHandler.on('data', (msg: number) => {
      // Do deep comparison (to.eql)
      expect(msg).to.eql({result: 15});
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
      callHandler.write({data: [1, 2, 3, 4, 5]});
      setTimeout(() => resolve(), 1000);
    });

  });

  after(async () => {
    await app.close();
    client.close;
  });

});
