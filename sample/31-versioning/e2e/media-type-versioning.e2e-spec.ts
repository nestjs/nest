import { INestApplication, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Versioning', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.enableVersioning({
      type: VersioningType.MEDIA_TYPE,
      key: 'v=',
    });
    await app.init();
  });

  describe('GET /', () => {
    it('V1', () => {
      return request(app.getHttpServer())
        .get('/')
        .set({
          Accept: 'application/json;v=1',
        })
        .expect(200)
        .expect('Hello World V1!');
    });

    it('V2', () => {
      return request(app.getHttpServer())
        .get('/')
        .set({
          Accept: 'application/json;v=2',
        })
        .expect(200)
        .expect('Hello World V2!');
    });

    it('V3', () => {
      return request(app.getHttpServer())
        .get('/')
        .set({
          Accept: 'application/json;v=3',
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
          Accept: 'application/json;v=1',
        })
        .expect(200)
        .expect('Parameter V1!');
    });

    it('V2', () => {
      return request(app.getHttpServer())
        .get('/param/hello')
        .set({
          Accept: 'application/json;v=2',
        })
        .expect(200)
        .expect('Parameter V2!');
    });

    it('V3', () => {
      return request(app.getHttpServer())
        .get('/param/hello')
        .set({
          Accept: 'application/json;v=3',
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
          Accept: 'application/json;v=1',
        })
        .expect(200)
        .expect('Multiple Versions 1 or 2');
    });

    it('V2', () => {
      return request(app.getHttpServer())
        .get('/multiple')
        .set({
          Accept: 'application/json;v=2',
        })
        .expect(200)
        .expect('Multiple Versions 1 or 2');
    });

    it('V3', () => {
      return request(app.getHttpServer())
        .get('/multiple')
        .set({
          Accept: 'application/json;v=3',
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
          Accept: 'application/json;v=1',
        })
        .expect(200)
        .expect('Neutral');
    });

    it('V2', () => {
      return request(app.getHttpServer())
        .get('/neutral')
        .set({
          Accept: 'application/json;v=2',
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
          Accept: 'application/json;v=1',
        })
        .expect(200)
        .expect('Override Version 1');
    });

    it('V2', () => {
      return request(app.getHttpServer())
        .get('/override')
        .set({
          Accept: 'application/json;v=2',
        })
        .expect(200)
        .expect('Override Version 2');
    });

    it('V3', () => {
      return request(app.getHttpServer())
        .get('/override')
        .set({
          Accept: 'application/json;v=3',
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
          Accept: 'application/json;v=1',
        })
        .expect(200)
        .expect('Override Partial Version 1');
    });

    it('V2', () => {
      return request(app.getHttpServer())
        .get('/override-partial')
        .set({
          Accept: 'application/json;v=2',
        })
        .expect(200)
        .expect('Override Partial Version 2');
    });

    it('V3', () => {
      return request(app.getHttpServer())
        .get('/override-partial')
        .set({
          Accept: 'application/json;v=3',
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
      return request(app.getHttpServer()).get('/override-partial').expect(404);
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
