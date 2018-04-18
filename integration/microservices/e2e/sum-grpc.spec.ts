import * as express from 'express';
import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';
import { join } from 'path';
import { GrpcController } from '../src/grpc/grpc.controller';

describe('GRPC transport', () => {
  let server;
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [GrpcController],
    }).compile();

    server = express();
    app = module.createNestApplication(server);
    app.connectMicroservice({
      transport: Transport.GRPC,
      options: {
        package: 'math',
        protoPath: join(__dirname, './../src/grpc/math.proto')
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
