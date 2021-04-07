import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

import { AppModule } from '../src/app.module';

describe('Fastify Cors', () => {
  let app: NestFastifyApplication;
  const configs = [
    {
      origin: 'example.com',
      methods: 'GET',
      credentials: true,
      exposedHeaders: ['foo', 'bar'],
      allowedHeaders: ['baz', 'woo'],
      maxAge: 123,
    },
    {
      origin: 'sample.com',
      methods: 'GET',
      credentials: true,
      exposedHeaders: ['zoo', 'bar'],
      allowedHeaders: ['baz', 'foo'],
      maxAge: 321,
    },
  ];
  describe('Dynamic config', () => {
    describe('enableCors', () => {
      before(async () => {
        const module = await Test.createTestingModule({
          imports: [AppModule],
        }).compile();

        app = module.createNestApplication<NestFastifyApplication>();

        let requestId = 0;
        const configDelegation = function (req, cb) {
          const config = configs[requestId];
          requestId++;
          cb(null, config);
        };
        app.enableCors(configDelegation);

        await app.init();
      });

      it(`Should add cors headers based on the first config`, async () => {
        return request(app.getHttpServer())
          .get('/')
          .expect('access-control-allow-origin', 'example.com')
          .expect('vary', 'Origin')
          .expect('access-control-allow-credentials', 'true')
          .expect('access-control-expose-headers', 'foo,bar')
          .expect('content-length', '0');
      });

      it(`Should add cors headers based on the second config`, async () => {
        return request(app.getHttpServer())
          .options('/')
          .expect('access-control-allow-origin', 'sample.com')
          .expect('vary', 'Origin')
          .expect('access-control-allow-credentials', 'true')
          .expect('access-control-expose-headers', 'zoo,bar')
          .expect('access-control-allow-methods', 'GET')
          .expect('access-control-allow-headers', 'baz,foo')
          .expect('access-control-max-age', '321')
          .expect('content-length', '0');
      });

      after(async () => {
        await app.close();
      });
    });

    describe('Application Options', () => {
      before(async () => {
        const module = await Test.createTestingModule({
          imports: [AppModule],
        }).compile();

        let requestId = 0;
        const configDelegation = function (req, cb) {
          const config = configs[requestId];
          requestId++;
          cb(null, config);
        };

        app = module.createNestApplication<NestFastifyApplication>(null, {
          cors: configDelegation,
        });

        await app.init();
      });

      it(`Should add cors headers based on the first config`, async () => {
        return request(app.getHttpServer())
          .get('/')
          .expect('access-control-allow-origin', 'example.com')
          .expect('vary', 'Origin')
          .expect('access-control-allow-credentials', 'true')
          .expect('access-control-expose-headers', 'foo,bar')
          .expect('content-length', '0');
      });

      it(`Should add cors headers based on the second config`, async () => {
        return request(app.getHttpServer())
          .options('/')
          .expect('access-control-allow-origin', 'sample.com')
          .expect('vary', 'Origin')
          .expect('access-control-allow-credentials', 'true')
          .expect('access-control-expose-headers', 'zoo,bar')
          .expect('access-control-allow-methods', 'GET')
          .expect('access-control-allow-headers', 'baz,foo')
          .expect('access-control-max-age', '321')
          .expect('content-length', '0');
      });

      after(async () => {
        await app.close();
      });
    });
  });

  describe('Static config', () => {
    describe('enableCors', () => {
      before(async () => {
        const module = await Test.createTestingModule({
          imports: [AppModule],
        }).compile();

        app = module.createNestApplication<NestFastifyApplication>();
        app.enableCors(configs[0]);

        await app.init();
      });

      it(`CORS headers`, async () => {
        return request(app.getHttpServer())
          .get('/')
          .expect('access-control-allow-origin', 'example.com')
          .expect('vary', 'Origin')
          .expect('access-control-allow-credentials', 'true')
          .expect('access-control-expose-headers', 'foo,bar')
          .expect('content-length', '0');
      });
    });

    after(async () => {
      await app.close();
    });
    describe('Application Options', () => {
      before(async () => {
        const module = await Test.createTestingModule({
          imports: [AppModule],
        }).compile();

        app = module.createNestApplication<NestFastifyApplication>(null, {
          cors: configs[0],
        });
        await app.init();
      });

      it(`CORS headers`, async () => {
        return request(app.getHttpServer())
          .get('/')
          .expect('access-control-allow-origin', 'example.com')
          .expect('vary', 'Origin')
          .expect('access-control-allow-credentials', 'true')
          .expect('access-control-expose-headers', 'foo,bar')
          .expect('content-length', '0');
      });
    });

    after(async () => {
      await app.close();
    });
  });
});
