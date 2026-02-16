import {
  Controller,
  Get,
  INestApplication,
  VersioningType,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { H3Adapter, NestH3Application } from '@nestjs/platform-h3';
import * as request from 'supertest';

// Version 1 Controller
@Controller({ version: '1' })
class AppV1Controller {
  @Get('/')
  helloWorldV1() {
    return 'Hello World V1!';
  }

  @Get('/:param/hello')
  paramV1() {
    return 'Parameter V1!';
  }
}

// Version 2 Controller
@Controller({ version: '2' })
class AppV2Controller {
  @Get('/')
  helloWorldV2() {
    return 'Hello World V2!';
  }

  @Get('/:param/hello')
  paramV2() {
    return 'Parameter V2!';
  }
}

// Multiple Versions Controller
@Controller({ version: ['1', '2'] })
class MultipleVersionController {
  @Get('/multiple')
  multiple() {
    return 'Multiple Versions 1 or 2';
  }
}

describe('Versioning (H3 adapter)', () => {
  let app: NestH3Application;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('URI Versioning', () => {
    beforeEach(async () => {
      const moduleRef = await Test.createTestingModule({
        controllers: [
          AppV1Controller,
          AppV2Controller,
          MultipleVersionController,
        ],
      }).compile();

      app = moduleRef.createNestApplication<NestH3Application>(new H3Adapter());
      app.enableVersioning({
        type: VersioningType.URI,
      });
      await app.init();
    });

    it('V1 - should return Hello World V1!', () => {
      return request(app.getHttpServer())
        .get('/v1/')
        .expect(200)
        .expect('Hello World V1!');
    });

    it('V2 - should return Hello World V2!', () => {
      return request(app.getHttpServer())
        .get('/v2/')
        .expect(200)
        .expect('Hello World V2!');
    });

    it('V3 - should return 404', () => {
      return request(app.getHttpServer()).get('/v3/').expect(404);
    });

    it('No Version - should return 404', () => {
      return request(app.getHttpServer()).get('/').expect(404);
    });

    it('V1 param - should return Parameter V1!', () => {
      return request(app.getHttpServer())
        .get('/v1/param/hello')
        .expect(200)
        .expect('Parameter V1!');
    });

    it('V2 param - should return Parameter V2!', () => {
      return request(app.getHttpServer())
        .get('/v2/param/hello')
        .expect(200)
        .expect('Parameter V2!');
    });

    it('Multiple V1 - should return Multiple Versions 1 or 2', () => {
      return request(app.getHttpServer())
        .get('/v1/multiple')
        .expect(200)
        .expect('Multiple Versions 1 or 2');
    });

    it('Multiple V2 - should return Multiple Versions 1 or 2', () => {
      return request(app.getHttpServer())
        .get('/v2/multiple')
        .expect(200)
        .expect('Multiple Versions 1 or 2');
    });
  });

  describe('Header Versioning', () => {
    beforeEach(async () => {
      const moduleRef = await Test.createTestingModule({
        controllers: [
          AppV1Controller,
          AppV2Controller,
          MultipleVersionController,
        ],
      }).compile();

      app = moduleRef.createNestApplication<NestH3Application>(new H3Adapter());
      app.enableVersioning({
        type: VersioningType.HEADER,
        header: 'X-API-Version',
      });
      await app.init();
    });

    it('V1 - should return Hello World V1!', () => {
      return request(app.getHttpServer())
        .get('/')
        .set({ 'X-API-Version': '1' })
        .expect(200)
        .expect('Hello World V1!');
    });

    it('V2 - should return Hello World V2!', () => {
      return request(app.getHttpServer())
        .get('/')
        .set({ 'X-API-Version': '2' })
        .expect(200)
        .expect('Hello World V2!');
    });

    it('V3 - should return 404', () => {
      return request(app.getHttpServer())
        .get('/')
        .set({ 'X-API-Version': '3' })
        .expect(404);
    });

    it('No Header - should return 404', () => {
      return request(app.getHttpServer()).get('/').expect(404);
    });

    it('V1 param - should return Parameter V1!', () => {
      return request(app.getHttpServer())
        .get('/param/hello')
        .set({ 'X-API-Version': '1' })
        .expect(200)
        .expect('Parameter V1!');
    });

    it('Multiple V1 - should return Multiple Versions 1 or 2', () => {
      return request(app.getHttpServer())
        .get('/multiple')
        .set({ 'X-API-Version': '1' })
        .expect(200)
        .expect('Multiple Versions 1 or 2');
    });

    it('Multiple V2 - should return Multiple Versions 1 or 2', () => {
      return request(app.getHttpServer())
        .get('/multiple')
        .set({ 'X-API-Version': '2' })
        .expect(200)
        .expect('Multiple Versions 1 or 2');
    });
  });

  describe('Media Type Versioning', () => {
    beforeEach(async () => {
      const moduleRef = await Test.createTestingModule({
        controllers: [
          AppV1Controller,
          AppV2Controller,
          MultipleVersionController,
        ],
      }).compile();

      app = moduleRef.createNestApplication<NestH3Application>(new H3Adapter());
      app.enableVersioning({
        type: VersioningType.MEDIA_TYPE,
        key: 'v=',
      });
      await app.init();
    });

    it('V1 - should return Hello World V1!', () => {
      return request(app.getHttpServer())
        .get('/')
        .set({ Accept: 'application/json;v=1' })
        .expect(200)
        .expect('Hello World V1!');
    });

    it('V2 - should return Hello World V2!', () => {
      return request(app.getHttpServer())
        .get('/')
        .set({ Accept: 'application/json;v=2' })
        .expect(200)
        .expect('Hello World V2!');
    });

    it('V3 - should return 404', () => {
      return request(app.getHttpServer())
        .get('/')
        .set({ Accept: 'application/json;v=3' })
        .expect(404);
    });

    it('No Version - should return 404', () => {
      return request(app.getHttpServer())
        .get('/')
        .set({ Accept: 'application/json' })
        .expect(404);
    });

    it('V1 param - should return Parameter V1!', () => {
      return request(app.getHttpServer())
        .get('/param/hello')
        .set({ Accept: 'application/json;v=1' })
        .expect(200)
        .expect('Parameter V1!');
    });

    it('Multiple V1 - should return Multiple Versions 1 or 2', () => {
      return request(app.getHttpServer())
        .get('/multiple')
        .set({ Accept: 'application/json;v=1' })
        .expect(200)
        .expect('Multiple Versions 1 or 2');
    });

    it('Multiple V2 - should return Multiple Versions 1 or 2', () => {
      return request(app.getHttpServer())
        .get('/multiple')
        .set({ Accept: 'application/json;v=2' })
        .expect(200)
        .expect('Multiple Versions 1 or 2');
    });
  });

  describe('Custom Versioning', () => {
    const extractor = (request: any): string | string[] => {
      const versions = (request.headers?.['accept'] || '')
        .split(',')
        .map((header: string) => header.match(/v(\d+\.?\d*)\+json$/))
        .filter((match: RegExpMatchArray | null) => match && match.length)
        .map((matchArray: RegExpMatchArray) => matchArray[1])
        .sort()
        .reverse();

      return versions;
    };

    beforeEach(async () => {
      const moduleRef = await Test.createTestingModule({
        controllers: [
          AppV1Controller,
          AppV2Controller,
          MultipleVersionController,
        ],
      }).compile();

      app = moduleRef.createNestApplication<NestH3Application>(new H3Adapter());
      app.enableVersioning({
        type: VersioningType.CUSTOM,
        extractor,
      });
      await app.init();
    });

    it('V1 - should return Hello World V1!', () => {
      return request(app.getHttpServer())
        .get('/')
        .set({ Accept: 'application/foo.v1+json' })
        .expect(200)
        .expect('Hello World V1!');
    });

    it('V2 - should return Hello World V2!', () => {
      return request(app.getHttpServer())
        .get('/')
        .set({ Accept: 'application/foo.v2+json' })
        .expect(200)
        .expect('Hello World V2!');
    });

    it('V3 - should return 404', () => {
      return request(app.getHttpServer())
        .get('/')
        .set({ Accept: 'application/foo.v3+json' })
        .expect(404);
    });

    it('No Header - should return 404', () => {
      return request(app.getHttpServer()).get('/').expect(404);
    });

    it('V1 param - should return Parameter V1!', () => {
      return request(app.getHttpServer())
        .get('/param/hello')
        .set({ Accept: 'application/foo.v1+json' })
        .expect(200)
        .expect('Parameter V1!');
    });

    it('Multiple V1 - should return Multiple Versions 1 or 2', () => {
      return request(app.getHttpServer())
        .get('/multiple')
        .set({ Accept: 'application/foo.v1+json' })
        .expect(200)
        .expect('Multiple Versions 1 or 2');
    });

    it('Multiple V2 - should return Multiple Versions 1 or 2', () => {
      return request(app.getHttpServer())
        .get('/multiple')
        .set({ Accept: 'application/foo.v2+json' })
        .expect(200)
        .expect('Multiple Versions 1 or 2');
    });
  });
});
