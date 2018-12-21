import { INestApplication } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { join } from 'path';
import * as request from 'supertest';
import { GrpcController } from '../src/grpc/grpc.controller';

describe('GRPC transport', () => {
  let server;
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [GrpcController],
    }).compile();

    app = module.createNestApplication();
    server = app.getHttpAdapter().getInstance();

    app.connectMicroservice({
      transport: Transport.GRPC,
      options: {
        package: 'math',
        protoPath: join(__dirname, '../src/grpc/math.proto'),
      },
    });
    await app.startAllMicroservicesAsync();
    await app.init();
  });

  it(`/POST`, () => {
    return request(server)
      .post('/')
      .send([1, 2, 3, 4, 5])
      .expect(200, { result: '15' });
  });

  afterEach(async () => {
    await app.close();
  });
});
