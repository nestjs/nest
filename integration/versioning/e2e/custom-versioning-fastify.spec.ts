import { INestApplication, VersioningType } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { FastifyRequest } from 'fastify';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Custom Versioning (fastify)', () => {
  const extractor = (request: FastifyRequest): string | string[] => {
    const versions = [request.headers['accept'] ?? '']
      .flatMap(v => v.split(','))
      .map(header => header.match(/v(\d+\.?\d*)\+json$/))
      .filter(match => match && match.length)
      .map(matchArray => matchArray![1])
      .sort()
      .reverse();

    return versions;
  };
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
        type: VersioningType.CUSTOM,
        extractor,
      });
      await app.init();
      await app.getHttpAdapter().getInstance().ready();
    });

    describe('GET /', () => {
      it('V1', () => {
        return request(app.getHttpServer())
          .get('/')
          .set({
            Accept: 'application/foo.v1+json',
          })
          .expect(200)
          .expect('Hello World V1!');
      });

      it('V2', () => {
        return request(app.getHttpServer())
          .get('/')
          .set({
            Accept: 'application/foo.v2+json',
          })
          .expect(200)
          .expect('Hello World V2!');
      });

      it('V2, if two versions are requested, select the highest version', () => {
        return request(app.getHttpServer())
          .get('/')
          .set({
            Accept: 'application/foo.v1+json, application/foo.v2+json',
          })
          .expect(200)
          .expect('Hello World V2!');
      });

      it('V2, if a non-existent version is requested, select the highest supported version', () => {
        return request(app.getHttpServer())
          .get('/')
          .set({
            Accept:
              'application/foo.v1+json, application/foo.v2+json, application/foo.v3+json',
          })
          .expect(200)
          .expect('Hello World V2!');
      });

      it('V3', () => {
        return request(app.getHttpServer())
          .get('/')
          .set({
            Accept: 'application/foo.v3+json',
          })
          .expect(404);
      });

      it('No Version', () => {
        return request(app.getHttpServer())
          .get('/')
          .set({
            Accept: 'application/json',
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
            Accept: 'application/foo.v1+json',
          })
          .expect(200)
          .expect('Parameter V1!');
      });

      it('V2', () => {
        return request(app.getHttpServer())
          .get('/param/hello')
          .set({
            Accept: 'application/foo.v2+json',
          })
          .expect(200)
          .expect('Parameter V2!');
      });

      it('V2, if two versions are requested, select the highest version', () => {
        return request(app.getHttpServer())
          .get('/param/hello')
          .set({
            Accept: 'application/foo.v1+json, application/foo.v2+json',
          })
          .expect(200)
          .expect('Parameter V2!');
      });

      it('V2, if a non-existent version is requested, select the highest supported version', () => {
        return request(app.getHttpServer())
          .get('/param/hello')
          .set({
            Accept:
              'application/foo.v1+json, application/foo.v2+json, application/foo.v3+json',
          })
          .expect(200)
          .expect('Parameter V2!');
      });

      it('V3', () => {
        return request(app.getHttpServer())
          .get('/param/hello')
          .set({
            Accept: 'application/foo.v3+json',
          })
          .expect(404);
      });

      it('No Version', () => {
        return request(app.getHttpServer())
          .get('/param/hello')
          .set({
            Accept: '',
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
            Accept: 'application/foo.v1+json',
          })
          .expect(200)
          .expect('Multiple Versions 1 or 2');
      });

      it('V2', () => {
        return request(app.getHttpServer())
          .get('/multiple')
          .set({
            Accept: 'application/foo.v2+json',
          })
          .expect(200)
          .expect('Multiple Versions 1 or 2');
      });

      it('V2, if two versions are requested, select the highest version', () => {
        return request(app.getHttpServer())
          .get('/multiple')
          .set({
            Accept: 'application/foo.v1+json, application/foo.v2+json',
          })
          .expect(200)
          .expect('Multiple Versions 1 or 2');
      });

      it('V2, if a non-existent version is requested, select the highest supported version', () => {
        return request(app.getHttpServer())
          .get('/multiple')
          .set({
            Accept:
              'application/foo.v1+json, application/foo.v2+json, application/foo.v3+json',
          })
          .expect(200)
          .expect('Multiple Versions 1 or 2');
      });

      it('V3', () => {
        return request(app.getHttpServer())
          .get('/multiple')
          .set({
            Accept: 'application/foo.v3+json',
          })
          .expect(404);
      });

      it('No Version', () => {
        return request(app.getHttpServer())
          .get('/multiple')
          .set({
            Accept: 'application/json',
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
            Accept: 'application/foo.v1+json',
          })
          .expect(200)
          .expect('Neutral');
      });

      it('V2', () => {
        return request(app.getHttpServer())
          .get('/neutral')
          .set({
            Accept: 'application/foo.v2+json',
          })
          .expect(200)
          .expect('Neutral');
      });

      it('V2, if two versions are requested, select the highest version', () => {
        return request(app.getHttpServer())
          .get('/neutral')
          .set({
            Accept: 'application/foo.v1+json, application/foo.v2+json',
          })
          .expect(200)
          .expect('Neutral');
      });

      it('V2, if a non-existent version is requested, select the highest supported version', () => {
        return request(app.getHttpServer())
          .get('/neutral')
          .set({
            Accept:
              'application/foo.v1+json, application/foo.v2+json, application/foo.v3+json',
          })
          .expect(200)
          .expect('Neutral');
      });

      it('No Version', () => {
        return request(app.getHttpServer())
          .get('/neutral')
          .set({
            Accept: 'application/json',
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
            Accept: 'application/foo.v1+json',
          })
          .expect(200)
          .expect('Override Version 1');
      });

      it('V2', () => {
        return request(app.getHttpServer())
          .get('/override')
          .set({
            Accept: 'application/foo.v2+json',
          })
          .expect(200)
          .expect('Override Version 2');
      });

      it('V2, if two versions are requested, select the highest version', () => {
        return request(app.getHttpServer())
          .get('/override')
          .set({
            Accept: 'application/foo.v1+json, application/foo.v2+json',
          })
          .expect(200)
          .expect('Override Version 2');
      });

      it('V2, if a non-existent version is requested, select the highest supported version', () => {
        return request(app.getHttpServer())
          .get('/override')
          .set({
            Accept:
              'application/foo.v1+json, application/foo.v2+json, application/foo.v3+json',
          })
          .expect(200)
          .expect('Override Version 2');
      });

      it('V3', () => {
        return request(app.getHttpServer())
          .get('/override')
          .set({
            Accept: 'application/foo.v3+json',
          })
          .expect(404);
      });

      it('No Version', () => {
        return request(app.getHttpServer())
          .get('/override')
          .set({
            Accept: 'application/json',
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
            Accept: 'application/foo.v1+json',
          })
          .expect(200)
          .expect('Override Partial Version 1');
      });

      it('V2', () => {
        return request(app.getHttpServer())
          .get('/override-partial')
          .set({
            Accept: 'application/foo.v2+json',
          })
          .expect(200)
          .expect('Override Partial Version 2');
      });

      it('V2, if two versions are requested, select the highest version', () => {
        return request(app.getHttpServer())
          .get('/override-partial')
          .set({
            Accept: 'application/foo.v1+json, application/foo.v2+json',
          })
          .expect(200)
          .expect('Override Partial Version 2');
      });

      it('V2, if a non-existent version is requested, select the highest supported version', () => {
        return request(app.getHttpServer())
          .get('/override-partial')
          .set({
            Accept:
              'application/foo.v1+json, application/foo.v2+json, application/foo.v3+json',
          })
          .expect(200)
          .expect('Override Partial Version 2');
      });

      it('V3', () => {
        return request(app.getHttpServer())
          .get('/override-partial')
          .set({
            Accept: 'application/foo.v3+json',
          })
          .expect(404);
      });

      it('No Version', () => {
        return request(app.getHttpServer())
          .get('/override-partial')
          .set({
            Accept: 'application/json',
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
            Accept: 'application/foo.v1+json',
          })
          .expect(200)
          .expect('Hello FooBar!');
      });

      it('V2', () => {
        return request(app.getHttpServer())
          .get('/foo/bar')
          .set({
            Accept: 'application/foo.v2+json',
          })
          .expect(200)
          .expect('Hello FooBar!');
      });

      it('V2, if two versions are requested, select the highest version', () => {
        return request(app.getHttpServer())
          .get('/foo/bar')
          .set({
            Accept: 'application/foo.v1+json, application/foo.v2+json',
          })
          .expect(200)
          .expect('Hello FooBar!');
      });

      it('V2, if a non-existent version is requested, select the highest supported version', () => {
        return request(app.getHttpServer())
          .get('/foo/bar')
          .set({
            Accept:
              'application/foo.v1+json, application/foo.v2+json, application/foo.v3+json',
          })
          .expect(200)
          .expect('Hello FooBar!');
      });

      it('V3', () => {
        return request(app.getHttpServer())
          .get('/foo/bar')
          .set({
            Accept: 'application/foo.v3+json',
          })
          .expect(200)
          .expect('Hello FooBar!');
      });

      it('No Version', () => {
        return request(app.getHttpServer())
          .get('/foo/bar')
          .set({
            Accept: 'application/json',
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
        type: VersioningType.CUSTOM,
        extractor,
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
            Accept: 'application/foo.v1+json',
          })
          .expect(200)
          .expect('Hello World V1!');
      });

      it('V2', () => {
        return request(app.getHttpServer())
          .get('/')
          .set({
            Accept: 'application/foo.v2+json',
          })
          .expect(200)
          .expect('Hello World V2!');
      });

      it('V2, if two versions are requested, select the highest version', () => {
        return request(app.getHttpServer())
          .get('/')
          .set({
            Accept: 'application/foo.v1+json, application/foo.v2+json',
          })
          .expect(200)
          .expect('Hello World V2!');
      });

      it('V2, if a non-existent version is requested, select the highest supported version', () => {
        return request(app.getHttpServer())
          .get('/')
          .set({
            Accept:
              'application/foo.v1+json, application/foo.v2+json, application/foo.v3+json',
          })
          .expect(200)
          .expect('Hello World V2!');
      });

      it('V3', () => {
        return request(app.getHttpServer())
          .get('/')
          .set({
            Accept: 'application/foo.v3+json',
          })
          .expect(404);
      });

      it('No Version', () => {
        return request(app.getHttpServer())
          .get('/')
          .set({
            Accept: 'application/json',
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
            Accept: 'application/foo.v1+json',
          })
          .expect(200)
          .expect('Parameter V1!');
      });

      it('V2', () => {
        return request(app.getHttpServer())
          .get('/param/hello')
          .set({
            Accept: 'application/foo.v2+json',
          })
          .expect(200)
          .expect('Parameter V2!');
      });

      it('V2, if two versions are requested, select the highest version', () => {
        return request(app.getHttpServer())
          .get('/param/hello')
          .set({
            Accept: 'application/foo.v1+json, application/foo.v2+json',
          })
          .expect(200)
          .expect('Parameter V2!');
      });

      it('V2, if a non-existent version is requested, select the highest supported version', () => {
        return request(app.getHttpServer())
          .get('/param/hello')
          .set({
            Accept:
              'application/foo.v1+json, application/foo.v2+json, application/foo.v3+json',
          })
          .expect(200)
          .expect('Parameter V2!');
      });

      it('V3', () => {
        return request(app.getHttpServer())
          .get('/param/hello')
          .set({
            Accept: 'application/foo.v3+json',
          })
          .expect(404);
      });

      it('No Version', () => {
        return request(app.getHttpServer())
          .get('/param/hello')
          .set({
            Accept: '',
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
            Accept: 'application/foo.v1+json',
          })
          .expect(200)
          .expect('Multiple Versions 1 or 2');
      });

      it('V2', () => {
        return request(app.getHttpServer())
          .get('/multiple')
          .set({
            Accept: 'application/foo.v2+json',
          })
          .expect(200)
          .expect('Multiple Versions 1 or 2');
      });

      it('V2, if two versions are requested, select the highest version', () => {
        return request(app.getHttpServer())
          .get('/multiple')
          .set({
            Accept: 'application/foo.v1+json, application/foo.v2+json',
          })
          .expect(200)
          .expect('Multiple Versions 1 or 2');
      });

      it('V2, if a non-existent version is requested, select the highest supported version', () => {
        return request(app.getHttpServer())
          .get('/multiple')
          .set({
            Accept:
              'application/foo.v1+json, application/foo.v2+json, application/foo.v3+json',
          })
          .expect(200)
          .expect('Multiple Versions 1 or 2');
      });

      it('V3', () => {
        return request(app.getHttpServer())
          .get('/multiple')
          .set({
            Accept: 'application/foo.v3+json',
          })
          .expect(404);
      });

      it('No Version', () => {
        return request(app.getHttpServer())
          .get('/multiple')
          .set({
            Accept: 'application/json',
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
            Accept: 'application/foo.v1+json',
          })
          .expect(200)
          .expect('Neutral');
      });

      it('V2', () => {
        return request(app.getHttpServer())
          .get('/neutral')
          .set({
            Accept: 'application/foo.v2+json',
          })
          .expect(200)
          .expect('Neutral');
      });

      it('V2, if two versions are requested, select the highest version', () => {
        return request(app.getHttpServer())
          .get('/neutral')
          .set({
            Accept: 'application/foo.v1+json, application/foo.v2+json',
          })
          .expect(200)
          .expect('Neutral');
      });

      it('V2, if a non-existent version is requested, select the highest supported version', () => {
        return request(app.getHttpServer())
          .get('/neutral')
          .set({
            Accept:
              'application/foo.v1+json, application/foo.v2+json, application/foo.v3+json',
          })
          .expect(200)
          .expect('Neutral');
      });

      it('No Version', () => {
        return request(app.getHttpServer())
          .get('/neutral')
          .set({
            Accept: 'application/json',
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
            Accept: 'application/foo.v1+json',
          })
          .expect(200)
          .expect('Override Version 1');
      });

      it('V2', () => {
        return request(app.getHttpServer())
          .get('/override')
          .set({
            Accept: 'application/foo.v2+json',
          })
          .expect(200)
          .expect('Override Version 2');
      });

      it('V2, if two versions are requested, select the highest version', () => {
        return request(app.getHttpServer())
          .get('/override')
          .set({
            Accept: 'application/foo.v1+json, application/foo.v2+json',
          })
          .expect(200)
          .expect('Override Version 2');
      });

      it('V2, if a non-existent version is requested, select the highest supported version', () => {
        return request(app.getHttpServer())
          .get('/override')
          .set({
            Accept:
              'application/foo.v1+json, application/foo.v2+json, application/foo.v3+json',
          })
          .expect(200)
          .expect('Override Version 2');
      });

      it('V3', () => {
        return request(app.getHttpServer())
          .get('/override')
          .set({
            Accept: 'application/foo.v3+json',
          })
          .expect(404);
      });

      it('No Version', () => {
        return request(app.getHttpServer())
          .get('/override')
          .set({
            Accept: 'application/json',
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
            Accept: 'application/foo.v1+json',
          })
          .expect(200)
          .expect('Override Partial Version 1');
      });

      it('V2', () => {
        return request(app.getHttpServer())
          .get('/override-partial')
          .set({
            Accept: 'application/foo.v2+json',
          })
          .expect(200)
          .expect('Override Partial Version 2');
      });

      it('V2, if two versions are requested, select the highest version', () => {
        return request(app.getHttpServer())
          .get('/override-partial')
          .set({
            Accept: 'application/foo.v1+json, application/foo.v2+json',
          })
          .expect(200)
          .expect('Override Partial Version 2');
      });

      it('V2, if a non-existent version is requested, select the highest supported version', () => {
        return request(app.getHttpServer())
          .get('/override-partial')
          .set({
            Accept:
              'application/foo.v1+json, application/foo.v2+json, application/foo.v3+json',
          })
          .expect(200)
          .expect('Override Partial Version 2');
      });

      it('V3', () => {
        return request(app.getHttpServer())
          .get('/override-partial')
          .set({
            Accept: 'application/foo.v3+json',
          })
          .expect(404);
      });

      it('No Version', () => {
        return request(app.getHttpServer())
          .get('/override-partial')
          .set({
            Accept: 'application/json',
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
            Accept: 'application/foo.v1+json',
          })
          .expect(200)
          .expect('Hello FooBar!');
      });

      it('V2', () => {
        return request(app.getHttpServer())
          .get('/foo/bar')
          .set({
            Accept: 'application/foo.v2+json',
          })
          .expect(404);
      });

      it('V2, if a non-existent version is requested, select the highest supported version', () => {
        return request(app.getHttpServer())
          .get('/foo/bar')
          .set({
            Accept: 'application/foo.v1+json, application/foo.v2+json',
          })
          .expect('Hello FooBar!');
      });

      it('V3', () => {
        return request(app.getHttpServer())
          .get('/foo/bar')
          .set({
            Accept: 'application/foo.v3+json',
          })
          .expect(404);
      });

      it('No Version', () => {
        return request(app.getHttpServer())
          .get('/foo/bar')
          .set({
            Accept: 'application/json',
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
