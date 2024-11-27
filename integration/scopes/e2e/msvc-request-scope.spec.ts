import { INestApplication } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as request from 'supertest';
import { Guard } from '../src/msvc/guards/request-scoped.guard';
import { HelloController } from '../src/msvc/hello.controller';
import { HelloModule } from '../src/msvc/hello.module';
import { Interceptor } from '../src/msvc/interceptors/logging.interceptor';
import { UsersService } from '../src/msvc/users/users.service';

class Meta {
  static COUNTER = 0;
  constructor() {
    Meta.COUNTER++;
  }
}

describe('Request scope (microservices)', () => {
  let server;
  let app: INestApplication;

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
    app.connectMicroservice<MicroserviceOptions>({ transport: Transport.TCP });

    server = app.getHttpServer();
    await app.init();
    await app.startAllMicroservices();
  });

  describe('when one service is request scoped', () => {
    before(async () => {
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
      expect(HelloController.COUNTER).to.be.eql(3);
    });

    it(`should create service for each request`, () => {
      expect(UsersService.COUNTER).to.be.eql(3);
    });

    it(`should share static provider across requests`, () => {
      expect(Meta.COUNTER).to.be.eql(1);
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

  after(async () => {
    await app.close();
  });
});
