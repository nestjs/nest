import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as request from 'supertest';
import { Guard } from '../src/hello/guards/request-scoped.guard';
import { HelloController } from '../src/hello/hello.controller';
import { HelloModule } from '../src/hello/hello.module';
import { Interceptor } from '../src/hello/interceptors/logging.interceptor';
import { UserByIdPipe } from '../src/hello/users/user-by-id.pipe';
import { UsersService } from '../src/hello/users/users.service';

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

  before(async () => {
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
    before(async () => {
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
      expect(HelloController.COUNTER).to.be.eql(3);
    });

    it(`should create service for each request`, () => {
      expect(UsersService.COUNTER).to.be.eql(3);
    });

    it(`should share static provider across requests`, () => {
      expect(Meta.COUNTER).to.be.eql(1);
    });

    it(`should create request scoped pipe for each request`, () => {
      expect(UserByIdPipe.COUNTER).to.be.eql(3);
      expect(UserByIdPipe.REQUEST_SCOPED_DATA).to.deep.equal([1, 1, 1]);
    });

    it(`should create request scoped interceptor for each request`, () => {
      expect(Interceptor.COUNTER).to.be.eql(3);
      expect(Interceptor.REQUEST_SCOPED_DATA).to.deep.equal([1, 1, 1]);
    });

    it(`should create request scoped guard for each request`, () => {
      expect(Guard.COUNTER).to.be.eql(3);
      expect(Guard.REQUEST_SCOPED_DATA).to.deep.equal([1, 1, 1]);
    });
  });

  describe('when overlapping requests are handled', function () {
    this.timeout(20000);
    let controllerCounterBefore: number;
    let usersCounterBefore: number;
    let pipeCounterBefore: number;
    let interceptorCounterBefore: number;
    let guardCounterBefore: number;
    let pipeDataLengthBefore: number;
    let interceptorDataLengthBefore: number;
    let guardDataLengthBefore: number;
    let responses: request.Response[];

    before(async () => {
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
    });

    it('should complete every overlapping request successfully', () => {
      expect(responses.map(response => response.status)).to.deep.equal(
        Array.from({ length: OVERLAP_REQUEST_COUNT }, () => 200),
      );
    });

    it('should create a request-scoped controller and service for every overlapping request', () => {
      expect(HelloController.COUNTER - controllerCounterBefore).to.equal(
        OVERLAP_REQUEST_COUNT,
      );
      expect(UsersService.COUNTER - usersCounterBefore).to.equal(
        OVERLAP_REQUEST_COUNT,
      );
    });

    it('should create request-scoped enhancers for every overlapping request', () => {
      expect(UserByIdPipe.COUNTER - pipeCounterBefore).to.equal(
        OVERLAP_REQUEST_COUNT,
      );
      expect(Interceptor.COUNTER - interceptorCounterBefore).to.equal(
        OVERLAP_REQUEST_COUNT,
      );
      expect(Guard.COUNTER - guardCounterBefore).to.equal(
        OVERLAP_REQUEST_COUNT,
      );
      expect(
        UserByIdPipe.REQUEST_SCOPED_DATA.slice(pipeDataLengthBefore),
      ).to.deep.equal(Array.from({ length: OVERLAP_REQUEST_COUNT }, () => 1));
      expect(
        Interceptor.REQUEST_SCOPED_DATA.slice(interceptorDataLengthBefore),
      ).to.deep.equal(Array.from({ length: OVERLAP_REQUEST_COUNT }, () => 1));
      expect(
        Guard.REQUEST_SCOPED_DATA.slice(guardDataLengthBefore),
      ).to.deep.equal(Array.from({ length: OVERLAP_REQUEST_COUNT }, () => 1));
    });
  });

  after(async () => {
    await app.close();
  });
});
