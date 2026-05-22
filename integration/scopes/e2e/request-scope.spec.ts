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
  const OVERLAP_REQUEST_COUNT = 1000;
  let server;
  let app: INestApplication;
  let baseUrl: string;

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
    await app.listen(0);
    baseUrl = await app.getUrl();
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

  describe('when overlapping requests are handled', () => {
    let controllerCounterBefore: number;
    let usersCounterBefore: number;
    let pipeCounterBefore: number;
    let interceptorCounterBefore: number;
    let guardCounterBefore: number;
    let pipeDataLengthBefore: number;
    let interceptorDataLengthBefore: number;
    let guardDataLengthBefore: number;
    let responses: request.Response[];

    beforeAll(async () => {
      controllerCounterBefore = HelloController.COUNTER;
      usersCounterBefore = UsersService.COUNTER;
      pipeCounterBefore = UserByIdPipe.COUNTER;
      interceptorCounterBefore = Interceptor.COUNTER;
      guardCounterBefore = Guard.COUNTER;
      pipeDataLengthBefore = UserByIdPipe.REQUEST_SCOPED_DATA.length;
      interceptorDataLengthBefore = Interceptor.REQUEST_SCOPED_DATA.length;
      guardDataLengthBefore = Guard.REQUEST_SCOPED_DATA.length;

      responses = await Promise.all(
        Array.from({ length: OVERLAP_REQUEST_COUNT }, () =>
          request(baseUrl).get('/hello'),
        ),
      );
    }, 20000);

    it('should complete every overlapping request successfully', () => {
      expect(responses.map(response => response.status)).toEqual(
        Array.from({ length: OVERLAP_REQUEST_COUNT }, () => 200),
      );
    });

    it('should create a request-scoped controller and service for every overlapping request', () => {
      expect(HelloController.COUNTER - controllerCounterBefore).toBe(
        OVERLAP_REQUEST_COUNT,
      );
      expect(UsersService.COUNTER - usersCounterBefore).toBe(
        OVERLAP_REQUEST_COUNT,
      );
    });

    it('should create request-scoped enhancers for every overlapping request', () => {
      expect(UserByIdPipe.COUNTER - pipeCounterBefore).toBe(
        OVERLAP_REQUEST_COUNT,
      );
      expect(Interceptor.COUNTER - interceptorCounterBefore).toBe(
        OVERLAP_REQUEST_COUNT,
      );
      expect(Guard.COUNTER - guardCounterBefore).toBe(OVERLAP_REQUEST_COUNT);
      expect(
        UserByIdPipe.REQUEST_SCOPED_DATA.slice(pipeDataLengthBefore),
      ).toEqual(Array.from({ length: OVERLAP_REQUEST_COUNT }, () => 1));
      expect(
        Interceptor.REQUEST_SCOPED_DATA.slice(interceptorDataLengthBefore),
      ).toEqual(Array.from({ length: OVERLAP_REQUEST_COUNT }, () => 1));
      expect(Guard.REQUEST_SCOPED_DATA.slice(guardDataLengthBefore)).toEqual(
        Array.from({ length: OVERLAP_REQUEST_COUNT }, () => 1),
      );
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
