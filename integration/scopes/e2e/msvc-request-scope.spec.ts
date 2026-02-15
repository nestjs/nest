import { INestApplication } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Guard } from '../src/msvc/guards/request-scoped.guard.js';
import { HelloController } from '../src/msvc/hello.controller.js';
import { HelloModule } from '../src/msvc/hello.module.js';
import { Interceptor } from '../src/msvc/interceptors/logging.interceptor.js';
import { UsersService } from '../src/msvc/users/users.service.js';

class Meta {
  static COUNTER = 0;
  constructor() {
    Meta.COUNTER++;
  }
}

describe('Request scope (microservices)', () => {
  let server;
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        HelloModule.forRoot({
          provide: 'META',
          useClass: Meta,
        }),
      ],
    }).compile();

    app = module.createNestApplication();
    app.connectMicroservice<MicroserviceOptions>({ transport: Transport.TCP });

    server = app.getHttpServer();
    await app.init();
    await app.startAllMicroservices();
  });

  describe('when one service is request scoped', () => {
    beforeAll(async () => {
      const performHttpCall = end =>
        request(server)
          .get('/hello')
          .end((err, res) => {
            if (err) return end(err);
            end();
          });
      await new Promise<any>(resolve => performHttpCall(resolve));
      await new Promise<any>(resolve => performHttpCall(resolve));
      await new Promise<any>(resolve => performHttpCall(resolve));
    });

    it(`should create controller for each request`, () => {
      expect(HelloController.COUNTER).toEqual(3);
    });

    it(`should create service for each request`, () => {
      expect(UsersService.COUNTER).toEqual(3);
    });

    it(`should share static provider across requests`, () => {
      expect(Meta.COUNTER).toEqual(1);
    });

    it(`should create request scoped interceptor for each request`, () => {
      expect(Interceptor.COUNTER).toEqual(3);
      expect(Interceptor.REQUEST_SCOPED_DATA).toEqual([1, 1, 1]);
    });

    it(`should create request scoped guard for each request`, () => {
      expect(Guard.COUNTER).toEqual(3);
      expect(Guard.REQUEST_SCOPED_DATA).toEqual([1, 1, 1]);
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
