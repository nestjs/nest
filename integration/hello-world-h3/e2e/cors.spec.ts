import { expect } from 'chai';
import { Test } from '@nestjs/testing';
import { Controller, Get } from '@nestjs/common';
import { H3Adapter, NestH3Application } from '@nestjs/platform-h3';
import * as request from 'supertest';

@Controller('test')
class TestController {
  @Get()
  test() {
    return 'success';
  }
}

describe('CORS (H3 adapter)', () => {
  let app: NestH3Application;

  describe('with default options', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      app = module.createNestApplication<NestH3Application>(new H3Adapter());
      app.enableCors();
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('should handle simple CORS request', () => {
      return request(app.getHttpServer())
        .get('/test')
        .set('Origin', 'http://example.com')
        .expect(200)
        .expect('Access-Control-Allow-Origin', '*');
    });

    it('should handle preflight OPTIONS request', () => {
      return request(app.getHttpServer())
        .options('/test')
        .set('Origin', 'http://example.com')
        .set('Access-Control-Request-Method', 'GET')
        .expect(204)
        .expect('Access-Control-Allow-Origin', '*')
        .expect('Access-Control-Allow-Methods', /GET|\*/); // H3 returns '*' for all methods
    });
  });

  describe('with custom origin', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      app = module.createNestApplication<NestH3Application>(new H3Adapter());
      app.enableCors({
        origin: ['https://allowed-origin.com'],
      });
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('should set correct origin header', () => {
      return request(app.getHttpServer())
        .get('/test')
        .set('Origin', 'https://allowed-origin.com')
        .expect(200)
        .expect('Access-Control-Allow-Origin', 'https://allowed-origin.com');
    });
  });

  describe('with credentials', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      app = module.createNestApplication<NestH3Application>(new H3Adapter());
      app.enableCors({
        origin: '*',
        credentials: true,
      });
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('should include credentials header', () => {
      return request(app.getHttpServer())
        .get('/test')
        .set('Origin', 'http://example.com')
        .expect(200)
        .expect('Access-Control-Allow-Credentials', 'true');
    });
  });

  describe('with custom methods and headers', () => {
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      app = module.createNestApplication<NestH3Application>(new H3Adapter());
      app.enableCors({
        origin: '*',
        methods: ['GET', 'POST', 'PUT'],
        allowHeaders: ['Content-Type', 'Authorization'],
      });
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('should include custom methods in preflight', () => {
      return request(app.getHttpServer())
        .options('/test')
        .set('Origin', 'http://example.com')
        .set('Access-Control-Request-Method', 'PUT')
        .expect(204)
        .expect(res => {
          const methods = res.headers['access-control-allow-methods'];
          expect(methods).to.contain('GET');
          expect(methods).to.contain('POST');
          expect(methods).to.contain('PUT');
        });
    });

    it('should include custom allowed headers', () => {
      return request(app.getHttpServer())
        .options('/test')
        .set('Origin', 'http://example.com')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'Authorization')
        .expect(204)
        .expect(res => {
          const headers = res.headers['access-control-allow-headers'];
          expect(headers.toLowerCase()).to.contain('authorization');
        });
    });
  });
});
