import * as GRPC from '@grpc/grpc-js';
import * as ProtoLoader from '@grpc/proto-loader';
import { INestApplication } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { fail } from 'assert';
import { expect, use } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { join } from 'path';
import * as sinon from 'sinon';
import * as request from 'supertest';
import { GrpcController } from '../src/grpc/grpc.controller';

use(chaiAsPromised);

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
        package: ['math', 'math2'],
        protoPath: [
          join(__dirname, '../src/grpc/math.proto'),
          join(__dirname, '../src/grpc/math2.proto'),
        ],
      },
    });

    // Start gRPC microservice
    await app.startAllMicroservices();
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

  it(`GRPC Sending and Receiving HTTP POST`, async () => {
    await request(server)
      .post('/sum')
      .send([1, 2, 3, 4, 5])
      .expect(200, { result: 15 });

    await request(server)
      .post('/upperMethod/sum')
      .send([1, 2, 3, 4, 5])
      .expect(200, { result: 15 });
  });

  it(`GRPC Receiving serialized Error`, async () => {
    await request(server)
      .post('/error?client=standard')
      .expect(200)
      .expect('false');

    await request(server)
      .post('/error?client=custom')
      .expect(200)
      .expect('true');
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
      if (!String(err).toLowerCase().includes('cancelled')) {
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
      if (!String(err).toLowerCase().includes('cancelled')) {
        fail('gRPC Stream error happened, error: ' + err);
      }
    });

    return new Promise((resolve, reject) => {
      callHandler.write({ data: [1, 2, 3, 4, 5] });
      setTimeout(() => resolve(), 1000);
    });
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

  describe('streaming calls that error', () => {
    // We want to assert that the application does not crash when an error is encountered with an unhandledRejection
    // the best way to do that is to listen for the unhandledRejection event and fail the test if it is called
    let processSpy: sinon.SinonSpy;

    beforeEach(() => {
      processSpy = sinon.spy();
      process.on('unhandledRejection', processSpy);
    });

    afterEach(() => {
      process.off('unhandledRejection', processSpy);
    });

    it('should not crash when replying with an error', async () => {
      const call = new Promise<void>((resolve, reject) => {
        const stream = client.streamDivide({
          data: [{ dividend: 1, divisor: 0 }],
        });

        stream.on('data', () => {
          fail('Stream should not have emitted any data');
        });

        stream.on('error', err => {
          if (err.code !== GRPC.status.CANCELLED) {
            reject(err as Error);
          }
        });

        stream.on('end', () => {
          resolve();
        });
      });

      await expect(call).to.eventually.be.rejectedWith(
        '3 INVALID_ARGUMENT: dividing by 0 is not possible',
      );

      // if this fails the application has crashed
      expect(processSpy.called).to.be.false;
    });
  });

  after(async () => {
    await app.close();
  });
});
