import { INestApplication, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('URI Versioning', () => {
  let app: INestApplication;

  // ======================================================================== //
  describe('without global default version', () => {
    before(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleRef.createNestApplication();
      app.enableVersioning({
        type: VersioningType.URI,
      });
      await app.init();
    });

    describe('GET /', () => {
      it('V1', () => {
        return request(app.getHttpServer())
          .get('/v1/')
          .expect(200)
          .expect('Hello World V1!');
      });

      it('V2', () => {
        return request(app.getHttpServer())
          .get('/v2/')
          .expect(200)
          .expect('Hello World V2!');
      });

      it('V3', () => {
        return request(app.getHttpServer()).get('/v3/').expect(404);
      });

      it('No Version', () => {
        return request(app.getHttpServer()).get('/').expect(404);
      });
    });

    describe('GET /:param', () => {
      it('V1', () => {
        return request(app.getHttpServer())
          .get('/v1/param/hello')
          .expect(200)
          .expect('Parameter V1!');
      });

      it('V2', () => {
        return request(app.getHttpServer())
          .get('/v2/param/hello')
          .expect(200)
          .expect('Parameter V2!');
      });

      it('V3', () => {
        return request(app.getHttpServer()).get('/v3/param/hello').expect(404);
      });

      it('No Version', () => {
        return request(app.getHttpServer()).get('/param/hello').expect(404);
      });
    });

    describe('GET /multiple', () => {
      it('V1', () => {
        return request(app.getHttpServer())
          .get('/v1/multiple')
          .expect(200)
          .expect('Multiple Versions 1 or 2');
      });

      it('V2', () => {
        return request(app.getHttpServer())
          .get('/v2/multiple')
          .expect(200)
          .expect('Multiple Versions 1 or 2');
      });

      it('V3', () => {
        return request(app.getHttpServer()).get('/v3/multiple').expect(404);
      });

      it('No Version', () => {
        return request(app.getHttpServer()).get('/multiple').expect(404);
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

    describe('GET /override', () => {
      it('V1', () => {
        return request(app.getHttpServer())
          .get('/v1/override')
          .expect(200)
          .expect('Override Version 1');
      });

      it('V2', () => {
        return request(app.getHttpServer())
          .get('/v2/override')
          .expect(200)
          .expect('Override Version 2');
      });

      it('V3', () => {
        return request(app.getHttpServer()).get('/v3/override').expect(404);
      });

      it('No Version', () => {
        return request(app.getHttpServer()).get('/override').expect(404);
      });
    });

    describe('GET /override-partial', () => {
      it('V1', () => {
        return request(app.getHttpServer())
          .get('/v1/override-partial')
          .expect(200)
          .expect('Override Partial Version 1');
      });

      it('V2', () => {
        return request(app.getHttpServer())
          .get('/v2/override-partial')
          .expect(200)
          .expect('Override Partial Version 2');
      });

      it('V3', () => {
        return request(app.getHttpServer())
          .get('/v3/override-partial')
          .expect(404);
      });

      it('No Version', () => {
        return request(app.getHttpServer())
          .get('/override-partial')
          .expect(404);
      });
    });

    describe('GET /foo/bar', () => {
      it('V1', () => {
        return request(app.getHttpServer()).get('/v1/foo/bar').expect(404);
      });

      it('V2', () => {
        return request(app.getHttpServer()).get('/v2/foo/bar').expect(404);
      });

      it('V3', () => {
        return request(app.getHttpServer()).get('/v3/foo/bar').expect(404);
      });

      it('No Version', () => {
        return request(app.getHttpServer())
          .get('/foo/bar')
          .expect(200)
          .expect('Hello FooBar!');
      });
    });

    after(async () => {
      await app.close();
    });
  });

  // ======================================================================== //
  describe('with the global default version: "1"', () => {
    before(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleRef.createNestApplication();
      app.enableVersioning({
        type: VersioningType.URI,
        defaultVersion: '1',
      });
      await app.init();
    });

    describe('GET /', () => {
      it('V1', () => {
        return request(app.getHttpServer())
          .get('/v1')
          .expect(200)
          .expect('Hello World V1!');
      });

      it('V2', () => {
        return request(app.getHttpServer())
          .get('/v2')
          .expect(200)
          .expect('Hello World V2!');
      });

      it('V3', () => {
        return request(app.getHttpServer()).get('/v3').expect(404);
      });

      it('No Version', () => {
        return request(app.getHttpServer()).get('/').expect(404);
      });
    });

    describe('GET /:param', () => {
      it('V1', () => {
        return request(app.getHttpServer())
          .get('/v1/param/hello')
          .expect(200)
          .expect('Parameter V1!');
      });

      it('V2', () => {
        return request(app.getHttpServer())
          .get('/v2/param/hello')
          .expect(200)
          .expect('Parameter V2!');
      });

      it('V3', () => {
        return request(app.getHttpServer()).get('/v3/param/hello').expect(404);
      });

      it('No Version', () => {
        return request(app.getHttpServer()).get('/param/hello').expect(404);
      });
    });

    describe('GET /multiple', () => {
      it('V1', () => {
        return request(app.getHttpServer())
          .get('/v1/multiple')
          .expect(200)
          .expect('Multiple Versions 1 or 2');
      });

      it('V2', () => {
        return request(app.getHttpServer())
          .get('/v2/multiple')
          .expect(200)
          .expect('Multiple Versions 1 or 2');
      });

      it('V3', () => {
        return request(app.getHttpServer()).get('/v3/multiple').expect(404);
      });

      it('No Version', () => {
        return request(app.getHttpServer()).get('/multiple').expect(404);
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

    describe('GET /override', () => {
      it('V1', () => {
        return request(app.getHttpServer())
          .get('/v1/override')
          .expect(200)
          .expect('Override Version 1');
      });

      it('V2', () => {
        return request(app.getHttpServer())
          .get('/v2/override')
          .expect(200)
          .expect('Override Version 2');
      });

      it('V3', () => {
        return request(app.getHttpServer()).get('/v3/override').expect(404);
      });

      it('No Version', () => {
        return request(app.getHttpServer()).get('/override').expect(404);
      });
    });

    describe('GET /override-partial', () => {
      it('V1', () => {
        return request(app.getHttpServer())
          .get('/v1/override-partial')
          .expect(200)
          .expect('Override Partial Version 1');
      });

      it('V2', () => {
        return request(app.getHttpServer())
          .get('/v2/override-partial')
          .expect(200)
          .expect('Override Partial Version 2');
      });

      it('V3', () => {
        return request(app.getHttpServer())
          .get('/v3/override-partial')
          .expect(404);
      });

      it('No Version', () => {
        return request(app.getHttpServer())
          .get('/override-partial')
          .expect(404);
      });
    });

    describe('GET /foo/bar', () => {
      it('V1', () => {
        return request(app.getHttpServer())
          .get('/v1/foo/bar')
          .expect(200)
          .expect('Hello FooBar!');
      });

      it('V2', () => {
        return request(app.getHttpServer()).get('/v2/foo/bar').expect(404);
      });

      it('V3', () => {
        return request(app.getHttpServer()).get('/v3/foo/bar').expect(404);
      });

      it('No Version', () => {
        return request(app.getHttpServer()).get('/foo/bar').expect(404);
      });
    });

    after(async () => {
      await app.close();
    });
  });

  // ======================================================================== //
  describe('with the global prefix enabled and an excluded route', () => {
    before(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleRef.createNestApplication();
      app.setGlobalPrefix('api', { exclude: ['/foo/bar'] });
      app.enableVersioning({
        type: VersioningType.URI,
        defaultVersion: '1',
      });
      await app.init();
    });

    describe('GET /', () => {
      it('V1', () => {
        return request(app.getHttpServer())
          .get('/api/v1')
          .expect(200)
          .expect('Hello World V1!');
      });

      it('V2', () => {
        return request(app.getHttpServer())
          .get('/api/v2')
          .expect(200)
          .expect('Hello World V2!');
      });

      it('V3', () => {
        return request(app.getHttpServer()).get('/api/v3').expect(404);
      });

      it('No Version', () => {
        return request(app.getHttpServer()).get('/api').expect(404);
      });
    });

    describe('GET /foo/bar (excluded from the API prefix)', () => {
      it('V1', () => {
        return request(app.getHttpServer())
          .get('/v1/foo/bar')
          .expect(200)
          .expect('Hello FooBar!');
      });

      it('V2', () => {
        return request(app.getHttpServer()).get('/v2/foo/bar').expect(404);
      });

      it('V3', () => {
        return request(app.getHttpServer()).get('/v3/foo/bar').expect(404);
      });

      it('No Version', () => {
        return request(app.getHttpServer()).get('/foo/bar').expect(404);
      });
    });

    after(async () => {
      await app.close();
    });
  });

  // ======================================================================== //
  describe('with middleware applied', () => {
    before(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleRef.createNestApplication();
      app.enableVersioning({
        type: VersioningType.URI,
        defaultVersion: '1',
      });
      await app.init();
    });

    describe('GET /middleware', () => {
      it('should return "Hello from middleware function!"', () => {
        return request(app.getHttpServer())
          .get('/v1/middleware')
          .expect(200)
          .expect('Hello from middleware function!');
      });
    });

    describe('GET /middleware/override', () => {
      it('should return "Hello from middleware function!"', () => {
        return request(app.getHttpServer())
          .get('/v2/middleware/override')
          .expect(200)
          .expect('Hello from middleware function!');
      });
    });

    describe('GET /middleware/multiple', () => {
      it('should return "Hello from middleware function!" (v1)', () => {
        return request(app.getHttpServer())
          .get('/v1/middleware/multiple')
          .expect(200)
          .expect('Hello from middleware function!');
      });

      it('should return "Hello from middleware function!" (v2)', () => {
        return request(app.getHttpServer())
          .get('/v2/middleware/multiple')
          .expect(200)
          .expect('Hello from middleware function!');
      });
    });

    describe('GET /middleware/neutral', () => {
      it('should return "Hello from middleware function!"', () => {
        return request(app.getHttpServer())
          .get('/middleware/neutral')
          .expect(200)
          .expect('Hello from middleware function!');
      });
    });

    after(async () => {
      await app.close();
    });
  });
});
