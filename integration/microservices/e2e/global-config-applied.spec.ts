import { INestApplication } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as request from 'supertest';
import { ApplicationModule } from '../src/app.module';
import { SpyFilter, SpyGuard, SpyInterceptor, SpyPipe } from './spies';

describe('Global Config is applied', () => {
  let server;
  let app: INestApplication;

  let guard: SpyGuard;
  let filter: SpyFilter;
  let interceptor: SpyInterceptor;
  let pipe: SpyPipe;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [ApplicationModule],
    }).compile();

    app = module.createNestApplication();
    server = app.getHttpAdapter().getInstance();

    const microservice = app.connectMicroservice({
      transport: Transport.TCP,
      options: {
        host: '0.0.0.0',
      },
    });

    guard = new SpyGuard();
    microservice.useGlobalGuards(guard);

    filter = new SpyFilter();
    microservice.useGlobalFilters(filter);

    interceptor = new SpyInterceptor();
    microservice.useGlobalInterceptors(interceptor);

    pipe = new SpyPipe();
    microservice.useGlobalPipes(pipe);

    await app.startAllMicroservicesAsync();
    await app.init();
  });

  it(`Guard called`, async () => {
    await request(server)
      .post('/?command=sum')
      .send([1, 2, 3, 4, 5])
    ;

    expect(guard.called).to.be.true;
  });

  it(`Filter called`, async () => {
    await request(server)
      .post('/?command=exception')
      .send([1, 2, 3, 4, 5])
    ;

    expect(filter.called).to.be.true;
  });

  it(`Interceptor called`, async () => {
    await request(server)
      .post('/?command=sum')
      .send([1, 2, 3, 4, 5])
    ;

    expect(interceptor.called).to.be.true;
  });

  it(`Pipe called`, async () => {
    await request(server)
      .post('/?command=sum')
      .send([1, 2, 3, 4, 5])
    ;

    expect(pipe.called).to.be.true;
  });

  afterEach(async () => {
    await app.close();
  });
});
