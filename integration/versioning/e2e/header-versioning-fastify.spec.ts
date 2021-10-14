import { INestApplication, VersioningType } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Header Versioning (fastify)', () => {
  let app: INestApplication;

  // ======================================================================== //
  describe('without global default version', () => {
    before(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleRef.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter(),
      );
      app.enableVersioning({
        type: VersioningType.HEADER,
        header: 'X-API-Version',
      });
      await app.init();
      await app.getHttpAdapter().getInstance().ready();
    });

    describe('GET /', () => {
      it('V1', () => {
        return request(app.getHttpServer())
          .get('/')
          .set({
            'X-API-Version': '1',
          })
          .expect(200)
          .expect('Hello World V1!');
      });

      it('V2', () => {
        return request(app.getHttpServer())
          .get('/')
          .set({
            'X-API-Version': '2',
          })
          .expect(200)
          .expect('Hello World V2!');
      });

      it('V3', () => {
        return request(app.getHttpServer())
          .get('/')
          .set({
            'X-API-Version': '3',
          })
          .expect(404);
      });

      it('No Version', () => {
        return request(app.getHttpServer())
          .get('/')
          .set({
            'X-API-Version': '',
          })
          .expect(404);
      });

      it('No Header', () => {
        return request(app.getHttpServer()).get('/').expect(404);
      });
    });

    describe('GET /:param', () => {
      it('V1', () => {
        return request(app.getHttpServer())
          .get('/param/hello')
          .set({
            'X-API-Version': '1',
          })
          .expect(200)
          .expect('Parameter V1!');
      });

      it('V2', () => {
        return request(app.getHttpServer())
          .get('/param/hello')
          .set({
            'X-API-Version': '2',
          })
          .expect(200)
          .expect('Parameter V2!');
      });

      it('V3', () => {
        return request(app.getHttpServer())
          .get('/param/hello')
          .set({
            'X-API-Version': '3',
          })
          .expect(404);
      });

      it('No Version', () => {
        return request(app.getHttpServer())
          .get('/param/hello')
          .set({
            'X-API-Version': '',
          })
          .expect(404);
      });

      it('No Header', () => {
        return request(app.getHttpServer()).get('/').expect(404);
      });
    });

    describe('GET /multiple', () => {
      it('V1', () => {
        return request(app.getHttpServer())
          .get('/multiple')
          .set({
            'X-API-Version': '1',
          })
          .expect(200)
          .expect('Multiple Versions 1 or 2');
      });

      it('V2', () => {
        return request(app.getHttpServer())
          .get('/multiple')
          .set({
            'X-API-Version': '2',
          })
          .expect(200)
          .expect('Multiple Versions 1 or 2');
      });

      it('V3', () => {
        return request(app.getHttpServer())
          .get('/multiple')
          .set({
            'X-API-Version': '3',
          })
          .expect(404);
      });

      it('No Version', () => {
        return request(app.getHttpServer())
          .get('/multiple')
          .set({
            'X-API-Version': '',
          })
          .expect(404);
      });

      it('No Header', () => {
        return request(app.getHttpServer()).get('/multiple').expect(404);
      });
    });

    describe('GET /neutral', () => {
      it('V1', () => {
        return request(app.getHttpServer())
          .get('/neutral')
          .set({
            'X-API-Version': '1',
          })
          .expect(200)
          .expect('Neutral');
      });

      it('V2', () => {
        return request(app.getHttpServer())
          .get('/neutral')
          .set({
            'X-API-Version': '2',
          })
          .expect(200)
          .expect('Neutral');
      });

      it('No Version', () => {
        return request(app.getHttpServer())
          .get('/neutral')
          .set({
            'X-API-Version': '',
          })
          .expect(200)
          .expect('Neutral');
      });

      it('No Header', () => {
        return request(app.getHttpServer())
          .get('/neutral')
          .expect(200)
          .expect('Neutral');
      });
    });

    describe('GET /override', () => {
      it('V1', () => {
        return request(app.getHttpServer())
          .get('/override')
          .set({
            'X-API-Version': '1',
          })
          .expect(200)
          .expect('Override Version 1');
      });

      it('V2', () => {
        return request(app.getHttpServer())
          .get('/override')
          .set({
            'X-API-Version': '2',
          })
          .expect(200)
          .expect('Override Version 2');
      });

      it('V3', () => {
        return request(app.getHttpServer())
          .get('/override')
          .set({
            'X-API-Version': '3',
          })
          .expect(404);
      });

      it('No Version', () => {
        return request(app.getHttpServer())
          .get('/override')
          .set({
            'X-API-Version': '',
          })
          .expect(404);
      });

      it('No Header', () => {
        return request(app.getHttpServer()).get('/override').expect(404);
      });
    });

    describe('GET /override-partial', () => {
      it('V1', () => {
        return request(app.getHttpServer())
          .get('/override-partial')
          .set({
            'X-API-Version': '1',
          })
          .expect(200)
          .expect('Override Partial Version 1');
      });

      it('V2', () => {
        return request(app.getHttpServer())
          .get('/override-partial')
          .set({
            'X-API-Version': '2',
          })
          .expect(200)
          .expect('Override Partial Version 2');
      });

      it('V3', () => {
        return request(app.getHttpServer())
          .get('/override-partial')
          .set({
            'X-API-Version': '3',
          })
          .expect(404);
      });

      it('No Version', () => {
        return request(app.getHttpServer())
          .get('/override-partial')
          .set({
            'X-API-Version': '',
          })
          .expect(404);
      });

      it('No Header', () => {
        return request(app.getHttpServer())
          .get('/override-partial')
          .expect(404);
      });
    });

    describe('GET /foo/bar', () => {
      it('V1', () => {
        return request(app.getHttpServer())
          .get('/foo/bar')
          .set({
            'X-API-Version': '1',
          })
          .expect(200)
          .expect('Hello FooBar!');
      });

      it('V2', () => {
        return request(app.getHttpServer())
          .get('/foo/bar')
          .set({
            'X-API-Version': '2',
          })
          .expect(200)
          .expect('Hello FooBar!');
      });

      it('V3', () => {
        return request(app.getHttpServer())
          .get('/foo/bar')
          .set({
            'X-API-Version': '3',
          })
          .expect(200)
          .expect('Hello FooBar!');
      });

      it('No Version', () => {
        return request(app.getHttpServer())
          .get('/foo/bar')
          .set({
            'X-API-Version': '',
          })
          .expect(200)
          .expect('Hello FooBar!');
      });

      it('No Header', () => {
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

      app = moduleRef.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter(),
      );
      app.enableVersioning({
        type: VersioningType.HEADER,
        header: 'X-API-Version',
        defaultVersion: '1',
      });
      await app.init();
      await app.getHttpAdapter().getInstance().ready();
    });

    describe('GET /', () => {
      it('V1', () => {
        return request(app.getHttpServer())
          .get('/')
          .set({
            'X-API-Version': '1',
          })
          .expect(200)
          .expect('Hello World V1!');
      });

      it('V2', () => {
        return request(app.getHttpServer())
          .get('/')
          .set({
            'X-API-Version': '2',
          })
          .expect(200)
          .expect('Hello World V2!');
      });

      it('V3', () => {
        return request(app.getHttpServer())
          .get('/')
          .set({
            'X-API-Version': '3',
          })
          .expect(404);
      });

      it('No Version', () => {
        return request(app.getHttpServer())
          .get('/')
          .set({
            'X-API-Version': '',
          })
          .expect(404);
      });

      it('No Header', () => {
        return request(app.getHttpServer()).get('/').expect(404);
      });
    });

    describe('GET /:param', () => {
      it('V1', () => {
        return request(app.getHttpServer())
          .get('/param/hello')
          .set({
            'X-API-Version': '1',
          })
          .expect(200)
          .expect('Parameter V1!');
      });

      it('V2', () => {
        return request(app.getHttpServer())
          .get('/param/hello')
          .set({
            'X-API-Version': '2',
          })
          .expect(200)
          .expect('Parameter V2!');
      });

      it('V3', () => {
        return request(app.getHttpServer())
          .get('/param/hello')
          .set({
            'X-API-Version': '3',
          })
          .expect(404);
      });

      it('No Version', () => {
        return request(app.getHttpServer())
          .get('/param/hello')
          .set({
            'X-API-Version': '',
          })
          .expect(404);
      });

      it('No Header', () => {
        return request(app.getHttpServer()).get('/').expect(404);
      });
    });

    describe('GET /multiple', () => {
      it('V1', () => {
        return request(app.getHttpServer())
          .get('/multiple')
          .set({
            'X-API-Version': '1',
          })
          .expect(200)
          .expect('Multiple Versions 1 or 2');
      });

      it('V2', () => {
        return request(app.getHttpServer())
          .get('/multiple')
          .set({
            'X-API-Version': '2',
          })
          .expect(200)
          .expect('Multiple Versions 1 or 2');
      });

      it('V3', () => {
        return request(app.getHttpServer())
          .get('/multiple')
          .set({
            'X-API-Version': '3',
          })
          .expect(404);
      });

      it('No Version', () => {
        return request(app.getHttpServer())
          .get('/multiple')
          .set({
            'X-API-Version': '',
          })
          .expect(404);
      });

      it('No Header', () => {
        return request(app.getHttpServer()).get('/multiple').expect(404);
      });
    });

    describe('GET /neutral', () => {
      it('V1', () => {
        return request(app.getHttpServer())
          .get('/neutral')
          .set({
            'X-API-Version': '1',
          })
          .expect(200)
          .expect('Neutral');
      });

      it('V2', () => {
        return request(app.getHttpServer())
          .get('/neutral')
          .set({
            'X-API-Version': '2',
          })
          .expect(200)
          .expect('Neutral');
      });

      it('No Version', () => {
        return request(app.getHttpServer())
          .get('/neutral')
          .set({
            'X-API-Version': '',
          })
          .expect(200)
          .expect('Neutral');
      });

      it('No Header', () => {
        return request(app.getHttpServer())
          .get('/neutral')
          .expect(200)
          .expect('Neutral');
      });
    });

    describe('GET /override', () => {
      it('V1', () => {
        return request(app.getHttpServer())
          .get('/override')
          .set({
            'X-API-Version': '1',
          })
          .expect(200)
          .expect('Override Version 1');
      });

      it('V2', () => {
        return request(app.getHttpServer())
          .get('/override')
          .set({
            'X-API-Version': '2',
          })
          .expect(200)
          .expect('Override Version 2');
      });

      it('V3', () => {
        return request(app.getHttpServer())
          .get('/override')
          .set({
            'X-API-Version': '3',
          })
          .expect(404);
      });

      it('No Version', () => {
        return request(app.getHttpServer())
          .get('/override')
          .set({
            'X-API-Version': '',
          })
          .expect(404);
      });

      it('No Header', () => {
        return request(app.getHttpServer()).get('/override').expect(404);
      });
    });

    describe('GET /override-partial', () => {
      it('V1', () => {
        return request(app.getHttpServer())
          .get('/override-partial')
          .set({
            'X-API-Version': '1',
          })
          .expect(200)
          .expect('Override Partial Version 1');
      });

      it('V2', () => {
        return request(app.getHttpServer())
          .get('/override-partial')
          .set({
            'X-API-Version': '2',
          })
          .expect(200)
          .expect('Override Partial Version 2');
      });

      it('V3', () => {
        return request(app.getHttpServer())
          .get('/override-partial')
          .set({
            'X-API-Version': '3',
          })
          .expect(404);
      });

      it('No Version', () => {
        return request(app.getHttpServer())
          .get('/override-partial')
          .set({
            'X-API-Version': '',
          })
          .expect(404);
      });

      it('No Header', () => {
        return request(app.getHttpServer())
          .get('/override-partial')
          .expect(404);
      });
    });

    describe('GET /foo/bar', () => {
      it('V1', () => {
        return request(app.getHttpServer())
          .get('/foo/bar')
          .set({
            'X-API-Version': '1',
          })
          .expect(200)
          .expect('Hello FooBar!');
      });

      it('V2', () => {
        return request(app.getHttpServer())
          .get('/foo/bar')
          .set({
            'X-API-Version': '2',
          })
          .expect(404);
      });

      it('V3', () => {
        return request(app.getHttpServer())
          .get('/foo/bar')
          .set({
            'X-API-Version': '3',
          })
          .expect(404);
      });

      it('No Version', () => {
        return request(app.getHttpServer())
          .get('/foo/bar')
          .set({
            'X-API-Version': '',
          })
          .expect(404);
      });

      it('No Header', () => {
        return request(app.getHttpServer()).get('/foo/bar').expect(404);
      });
    });

    after(async () => {
      await app.close();
    });
  });
});
