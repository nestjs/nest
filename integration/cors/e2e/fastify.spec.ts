import {
  NestFastifyApplication,
  FastifyAdapter,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
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
      beforeEach(async () => {
        const module = await Test.createTestingModule({
          imports: [AppModule],
        }).compile();

        app = module.createNestApplication<NestFastifyApplication>(
          new FastifyAdapter(),
        );

        let requestId = 0;
        const configDelegation = function (req, cb) {
          const config = configs[requestId];
          requestId++;
          cb(null, config);
        };
        app.enableCors(configDelegation);

        await app.init();
      });

      it(`should add cors headers based on the first config`, async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/',
        });

        expect(response.headers['access-control-allow-origin'], 'example.com');
        expect(response.headers['vary'], 'Origin');
        expect(response.headers['access-control-allow-credentials'], 'true');
        expect(response.headers['access-control-expose-headers'], 'foo,bar');
        expect(response.headers['content-length'], '0');
      });

      it(`should add cors headers based on the second config`, async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/',
        });

        expect(response.headers['access-control-allow-origin'], 'sample.com');
        expect(response.headers['vary'], 'Origin');
        expect(response.headers['access-control-allow-credentials'], 'true');
        expect(response.headers['access-control-expose-headers'], 'zoo,bar');
        expect(response.headers['access-control-allow-methods'], 'GET');
        expect(response.headers['access-control-allow-headers'], 'baz,foo');
        expect(response.headers['access-control-max-age'], '321');
        expect(response.headers['content-length'], '0');
      });

      afterEach(async () => {
        await app.close();
      });
    });

    describe('Application Options', () => {
      beforeEach(async () => {
        const module = await Test.createTestingModule({
          imports: [AppModule],
        }).compile();

        let requestId = 0;
        const configDelegation = function (req, cb) {
          const config = configs[requestId];
          requestId++;
          cb(null, config);
        };

        app = module.createNestApplication<NestFastifyApplication>(
          new FastifyAdapter(),
          {
            cors: configDelegation,
          },
        );

        await app.init();
      });

      it(`should add cors headers based on the first config`, async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/',
        });

        expect(response.headers['access-control-allow-origin'], 'example.com');
        expect(response.headers['vary'], 'Origin');
        expect(response.headers['access-control-allow-credentials'], 'true');
        expect(response.headers['access-control-expose-headers'], 'foo,bar');
        expect(response.headers['content-length'], '0');
      });

      it(`should add cors headers based on the second config`, async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/',
        });

        expect(response.headers['access-control-allow-origin'], 'sample.com');
        expect(response.headers['vary'], 'Origin');
        expect(response.headers['access-control-allow-credentials'], 'true');
        expect(response.headers['access-control-expose-headers'], 'zoo,bar');
        expect(response.headers['access-control-allow-methods'], 'GET');
        expect(response.headers['access-control-allow-headers'], 'baz,foo');
        expect(response.headers['access-control-max-age'], '321');
        expect(response.headers['content-length'], '0');
      });

      afterEach(async () => {
        await app.close();
      });
    });
  });

  describe('Static config', () => {
    describe('enableCors', () => {
      beforeEach(async () => {
        const module = await Test.createTestingModule({
          imports: [AppModule],
        }).compile();

        app = module.createNestApplication<NestFastifyApplication>(
          new FastifyAdapter(),
        );
        app.enableCors(configs[0]);

        await app.init();
      });

      it(`CORS headers`, async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/',
        });

        expect(response.headers['access-control-allow-origin'], 'example.com');
        expect(response.headers['vary'], 'Origin');
        expect(response.headers['access-control-allow-credentials'], 'true');
        expect(response.headers['access-control-expose-headers'], 'foo,bar');
        expect(response.headers['content-length'], '0');
      });
    });

    afterEach(async () => {
      await app.close();
    });

    describe('Application Options', () => {
      beforeEach(async () => {
        const module = await Test.createTestingModule({
          imports: [AppModule],
        }).compile();

        app = module.createNestApplication<NestFastifyApplication>(
          new FastifyAdapter(),
          {
            cors: configs[0],
          },
        );
        await app.init();
      });

      it(`CORS headers`, async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/',
        });

        expect(response.headers['access-control-allow-origin'], 'example.com');
        expect(response.headers['vary'], 'Origin');
        expect(response.headers['access-control-allow-credentials'], 'true');
        expect(response.headers['access-control-expose-headers'], 'foo,bar');
        expect(response.headers['content-length'], '0');
      });
    });

    afterEach(async () => {
      await app.close();
    });
  });
});
