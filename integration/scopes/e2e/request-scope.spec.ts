import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Guard } from '../src/hello/guards/request-scoped.guard.js';
import { HelloController } from '../src/hello/hello.controller.js';
import { HelloModule } from '../src/hello/hello.module.js';
import { Interceptor } from '../src/hello/interceptors/logging.interceptor.js';
import { UserByIdPipe } from '../src/hello/users/user-by-id.pipe.js';
import { UsersService } from '../src/hello/users/users.service.js';

class Meta {
  static COUNTER = 0;
  constructor() {
    Meta.COUNTER++;
  }
}

describe('Request scope', () => {
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
    server = app.getHttpServer();
    await app.init();
  });

  describe('when one service is request scoped', () => {
    beforeAll(async () => {
      const performHttpCall = end =>
        request(server)
          .get('/hello')
          .end(err => {
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

    it(`should create request scoped pipe for each request`, () => {
      expect(UserByIdPipe.COUNTER).toEqual(3);
      expect(UserByIdPipe.REQUEST_SCOPED_DATA).toEqual([1, 1, 1]);
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
