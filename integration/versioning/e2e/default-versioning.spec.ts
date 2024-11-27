import { INestApplication } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * `.enableVersioning()` uses `VersioningType.URI` type by default
 * Regression test for #13496
 * @see [Versioning](https://docs.nestjs.com/techniques/versioning)
 */
describe('Default Versioning behavior', () => {
  // ======================================================================== //
  describe('Express', () => {
    let app: INestApplication;
    before(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleRef.createNestApplication();
      app.enableVersioning();
      await app.init();
    });

    describe('GET /', () => {
      it('V1', () => {
        return request(app.getHttpServer())
          .get('/v1')
          .expect(200)
          .expect('Hello World V1!');
      });

      it('No Version', () => {
        return request(app.getHttpServer()).get('/').expect(404);
      });
    });

    describe('GET /neutral', () => {
      it('No Version', () => {
        return request(app.getHttpServer())
          .get('/neutral')
          .expect(200)
          .expect('Neutral');
      });
    });

    after(async () => {
      await app.close();
    });
  });

  // ======================================================================== //
  describe('Fastify', () => {
    let app: INestApplication;
    before(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleRef.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter(),
      );
      app.enableVersioning();
      await app.init();
      await app.getHttpAdapter().getInstance().ready();
    });

    describe('GET /', () => {
      it('V1', () => {
        return request(app.getHttpServer())
          .get('/v1')
          .expect(200)
          .expect('Hello World V1!');
      });

      it('No Version', () => {
        return request(app.getHttpServer()).get('/').expect(404);
      });
    });

    describe('GET /neutral', () => {
      it('No Version', () => {
        return request(app.getHttpServer())
          .get('/neutral')
          .expect(200)
          .expect('Neutral');
      });
    });

    after(async () => {
      await app.close();
    });
  });
});
