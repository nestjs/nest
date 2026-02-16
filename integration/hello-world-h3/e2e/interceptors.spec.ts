import * as request from 'supertest';
import { expect } from 'chai';
import { Test } from '@nestjs/testing';
import { Controller, Get } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { H3Adapter, NestH3Application } from '@nestjs/platform-h3';
import {
  OverrideInterceptor,
  TransformInterceptor,
  HeaderInterceptor,
  LoggingInterceptor,
  OVERRIDE_VALUE,
} from '../src/interceptors/interceptors';

@Controller('test')
class TestController {
  @Get()
  test() {
    return 'Hello world!';
  }

  @Get('async')
  async asyncTest() {
    return 'Async hello!';
  }

  @Get('object')
  objectTest() {
    return { message: 'Hello' };
  }
}

describe('Interceptors (H3 adapter)', () => {
  let app: NestH3Application;

  describe('OverrideInterceptor', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        controllers: [TestController],
        providers: [
          {
            provide: APP_INTERCEPTOR,
            useValue: new OverrideInterceptor(),
          },
        ],
      }).compile();

      app = module.createNestApplication<NestH3Application>(new H3Adapter());
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('should override response (sync)', () => {
      return request(app.getHttpServer())
        .get('/test')
        .expect(200)
        .expect(OVERRIDE_VALUE);
    });

    it('should override response (async)', () => {
      return request(app.getHttpServer())
        .get('/test/async')
        .expect(200)
        .expect(OVERRIDE_VALUE);
    });
  });

  describe('TransformInterceptor', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        controllers: [TestController],
        providers: [
          {
            provide: APP_INTERCEPTOR,
            useValue: new TransformInterceptor(),
          },
        ],
      }).compile();

      app = module.createNestApplication<NestH3Application>(new H3Adapter());
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('should wrap response in data object (string)', () => {
      return request(app.getHttpServer())
        .get('/test')
        .expect(200)
        .expect({ data: 'Hello world!' });
    });

    it('should wrap response in data object (async)', () => {
      return request(app.getHttpServer())
        .get('/test/async')
        .expect(200)
        .expect({ data: 'Async hello!' });
    });

    it('should wrap response in data object (object)', () => {
      return request(app.getHttpServer())
        .get('/test/object')
        .expect(200)
        .expect({ data: { message: 'Hello' } });
    });
  });

  describe('HeaderInterceptor', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        controllers: [TestController],
        providers: [
          {
            provide: APP_INTERCEPTOR,
            useValue: new HeaderInterceptor({
              'X-Custom-Header': 'custom-value',
              'X-Another-Header': 'another-value',
            }),
          },
        ],
      }).compile();

      app = module.createNestApplication<NestH3Application>(new H3Adapter());
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('should add custom headers to response', () => {
      return request(app.getHttpServer())
        .get('/test')
        .expect(200)
        .expect('X-Custom-Header', 'custom-value')
        .expect('X-Another-Header', 'another-value');
    });
  });

  describe('LoggingInterceptor', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        controllers: [TestController],
        providers: [
          {
            provide: APP_INTERCEPTOR,
            useValue: new LoggingInterceptor(),
          },
        ],
      }).compile();

      app = module.createNestApplication<NestH3Application>(new H3Adapter());
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('should add request info to response', () => {
      return request(app.getHttpServer())
        .get('/test/object')
        .expect(200)
        .expect(res => {
          expect(res.body.message).to.equal('Hello');
          expect(res.body.requestInfo).to.not.be.undefined;
          expect(res.body.requestInfo.method).to.equal('GET');
          expect(typeof res.body.requestInfo.executionTime).to.equal('number');
        });
    });
  });
});
