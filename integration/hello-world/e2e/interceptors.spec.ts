import {
  CallHandler,
  ExecutionContext,
  INestApplication,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { of } from 'rxjs';
import { map } from 'rxjs/operators';
import * as request from 'supertest';
import { ApplicationModule } from '../src/app.module';

const RETURN_VALUE = 'test';

@Injectable()
export class OverrideInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    return of(RETURN_VALUE);
  }
}

@Injectable()
export class TransformInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(map(data => ({ data })));
  }
}

function createTestModule(interceptor) {
  return Test.createTestingModule({
    imports: [ApplicationModule],
    providers: [
      {
        provide: APP_INTERCEPTOR,
        useValue: interceptor,
      },
    ],
  }).compile();
}

describe('Interceptors', () => {
  let app: INestApplication;

  it(`should transform response (sync)`, async () => {
    app = (await createTestModule(
      new OverrideInterceptor(),
    )).createNestApplication();

    await app.init();
    return request(app.getHttpServer())
      .get('/hello')
      .expect(200, RETURN_VALUE);
  });

  it(`should map response`, async () => {
    app = (await createTestModule(
      new TransformInterceptor(),
    )).createNestApplication();

    await app.init();
    return request(app.getHttpServer())
      .get('/hello')
      .expect(200, { data: 'Hello world!' });
  });

  it(`should map response (async)`, async () => {
    app = (await createTestModule(
      new TransformInterceptor(),
    )).createNestApplication();

    await app.init();
    return request(app.getHttpServer())
      .get('/hello/stream')
      .expect(200, { data: 'Hello world!' });
  });

  it(`should map response (stream)`, async () => {
    app = (await createTestModule(
      new TransformInterceptor(),
    )).createNestApplication();

    await app.init();
    return request(app.getHttpServer())
      .get('/hello/async')
      .expect(200, { data: 'Hello world!' });
  });

  afterEach(async () => {
    await app.close();
  });
});
