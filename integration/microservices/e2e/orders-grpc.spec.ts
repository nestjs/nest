import * as ProtoLoader from '@grpc/proto-loader';
import { INestApplication } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';
import { ExpressAdapter } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { fail } from 'assert';
import { expect } from 'chai';
import * as express from 'express';
import * as GRPC from 'grpc';
import { join } from 'path';
import * as request from 'supertest';
import { AdvancedGrpcController } from '../src/grpc-advanced/advanced.grpc.controller';

describe('Advanced GRPC transport', () => {
  let server;
  let app: INestApplication;
  let client: any;

  before(async () => {
    const module = await Test.createTestingModule({
      controllers: [AdvancedGrpcController],
    }).compile();
    // Create gRPC + HTTP server
    server = express();
    app = module.createNestApplication(new ExpressAdapter(server));
    /*
     *  Create microservice configuration
     */
    app.connectMicroservice({
      transport: Transport.GRPC,
      options: {
        url: 'localhost:5001',
        package: 'proto_example',
        protoPath: 'root.proto',
        loader: {
          includeDirs: [join(__dirname, '../src/grpc-advanced/proto')],
          keepCase: true,
        },
      },
    });
    // Start gRPC microservice
    await app.startAllMicroservicesAsync();
    await app.init();
    // Load proto-buffers for test gRPC dispatch
    const proto = ProtoLoader.loadSync('root.proto', {
      includeDirs: [join(__dirname, '../src/grpc-advanced/proto')],
    }) as any;
    // Create Raw gRPC client object
    const protoGRPC = GRPC.loadPackageDefinition(proto) as any;
    // Create client connected to started services at standard 5000 port
    client = new protoGRPC.proto_example.orders.OrderService(
      'localhost:5001',
      GRPC.credentials.createInsecure(),
    );
  });

  it(`GRPC Sending and Receiving HTTP POST`, () => {
    return request(server)
      .post('/')
      .send('1')
      .expect(200, {
        id: 1,
        itemTypes: [1],
        shipmentType: {
          from: 'test',
          to: 'test1',
          carrier: 'test-carrier',
        },
      });
  });

  it(`GRPC Streaming and Receiving HTTP POST`, () => {
    return request(server)
      .post('/client-streaming')
      .send('1')
      .expect(200, {
        id: 1,
        itemTypes: [1],
        shipmentType: {
          from: 'test',
          to: 'test1',
          carrier: 'test-carrier',
        },
      });
  });

  it('GRPC Sending and receiving message', async () => {
    // Execute find in Promise
    return new Promise(resolve => {
      client.find(
        {
          id: 1,
        },
        (err, result) => {
          // Compare results
          expect(err).to.be.null;
          expect(result).to.eql({
            id: 1,
            itemTypes: [1],
            shipmentType: {
              from: 'test',
              to: 'test1',
              carrier: 'test-carrier',
            },
          });
          // Resolve after checkups
          resolve();
        },
      );
    });
  });

  it('GRPC Sending and receiving Stream from RX handler', async () => {
    const callHandler = client.sync();

    callHandler.on('data', (msg: number) => {
      // Do deep comparison (to.eql)
      expect(msg).to.eql({
        id: 1,
        itemTypes: [1],
        shipmentType: {
          from: 'test',
          to: 'test1',
          carrier: 'test-carrier',
        },
      });
    });

    callHandler.on('error', (err: any) => {
      // We want to fail only on real errors while Cancellation error
      // is expected
      if (
        String(err)
          .toLowerCase()
          .indexOf('cancelled') === -1
      ) {
        fail('gRPC Stream error happened, error: ' + err);
      }
    });

    return new Promise((resolve, reject) => {
      callHandler.write({
        id: 1,
      });
      setTimeout(() => resolve(), 1000);
    });
  });

  it('GRPC Sending and receiving Stream from Call handler', async () => {
    const callHandler = client.syncCall();

    callHandler.on('data', (msg: number) => {
      // Do deep comparison (to.eql)
      expect(msg).to.eql({
        id: 1,
        itemTypes: [1],
        shipmentType: {
          from: 'test',
          to: 'test1',
          carrier: 'test-carrier',
        },
      });
    });

    callHandler.on('error', (err: any) => {
      // We want to fail only on real errors while Cancellation error
      // is expected
      if (
        String(err)
          .toLowerCase()
          .indexOf('cancelled') === -1
      ) {
        fail('gRPC Stream error happened, error: ' + err);
      }
    });

    return new Promise((resolve, reject) => {
      callHandler.write({
        id: 1,
      });
      setTimeout(() => resolve(), 1000);
    });
  });

  it('GRPC Sending Stream and receiving a single message from RX handler', async () => {
    const callHandler = client.streamReq((err, res) => {
      if (err) {
        throw err;
      }
      expect(res).to.eql({
        id: 1,
        itemTypes: [1],
        shipmentType: {
          from: 'test',
          to: 'test1',
          carrier: 'test-carrier',
        },
      });
    });

    return new Promise((resolve, reject) => {
      callHandler.write({
        id: 1,
      });
      setTimeout(() => resolve(), 1000);
    });
  });

  it('GRPC Sending Stream and receiving a single message from Call handler', async () => {
    const callHandler = client.streamReqCall((err, res) => {
      if (err) {
        throw err;
      }
      expect(res).to.eql({
        id: 1,
        itemTypes: [1],
        shipmentType: {
          from: 'test',
          to: 'test1',
          carrier: 'test-carrier',
        },
      });
    });

    return new Promise((resolve, reject) => {
      callHandler.write({
        id: 1,
      });
      setTimeout(() => resolve(), 1000);
    });
  });
});
