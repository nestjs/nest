import {
  ArgumentsHost,
  Controller,
  Get,
  HttpException,
  INestApplication,
  RequestMethod,
  VERSION_NEUTRAL,
  Version,
  VersioningOptions,
  VersioningType,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { VersionValue } from '@nestjs/common/internal';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

@Controller()
class ExcludedController {
  @Get('hello')
  hello() {
    return 'hello';
  }

  @Get('wild/{*splat}')
  @Version(['2', VERSION_NEUTRAL])
  wildcard() {
    return 'wildcard';
  }
}

describe('Global prefix exclusions with versioning', () => {
  let app: INestApplication;

  afterEach(async () => {
    await app?.close();
  });

  const uriCases: {
    prefix?: string | false;
    defaultVersion: VersionValue;
    versionPrefix: string;
  }[] = [
    { prefix: undefined, defaultVersion: '1', versionPrefix: 'v' },
    { prefix: 'version-', defaultVersion: '1', versionPrefix: 'version-' },
    { prefix: false, defaultVersion: '1', versionPrefix: '' },
    { prefix: undefined, defaultVersion: ['1', '3'], versionPrefix: 'v' },
    { prefix: undefined, defaultVersion: VERSION_NEUTRAL, versionPrefix: 'v' },
  ];

  async function createApp(options: VersioningOptions | undefined) {
    const module = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ExcludedController],
    }).compile();
    app = module.createNestApplication();
    // Exclusions also work when configured before versioning.
    app.setGlobalPrefix('api', {
      exclude: [
        { path: 'hello', method: RequestMethod.GET },
        'foo/bar',
        'override',
        'multiple',
        'multiple-neutral',
        'neutral',
        'middleware',
        'wild/{*splat}',
      ],
    });
    if (options) {
      app.enableVersioning(options);
    }
    app.useGlobalFilters({
      catch(exception: HttpException, host: ArgumentsHost) {
        host.switchToHttp().getResponse().status(exception.getStatus()).json({
          handledBy: 'nest',
          message: exception.message,
        });
      },
    });
    await app.init();
  }

  async function expectMethodMiss(path: string) {
    await request(app.getHttpServer())
      .post(path)
      .expect(404)
      .expect('Content-Type', /json/)
      .expect({ handledBy: 'nest', message: `Cannot POST ${path}` });
  }

  it.each(uriCases)(
    'uses resolved URI paths with prefix $prefix and defaultVersion $defaultVersion',
    async ({ prefix, defaultVersion, versionPrefix }) => {
      await createApp({ type: VersioningType.URI, prefix, defaultVersion });
      const versions = Array.isArray(defaultVersion)
        ? defaultVersion
        : [defaultVersion];
      const defaultPaths = versions.flatMap(version => {
        const base =
          version === VERSION_NEUTRAL ? '' : `/${versionPrefix}${version}`;
        return [`${base}/hello`, `${base}/foo/bar`];
      });
      const paths = [
        ...defaultPaths,
        `/${versionPrefix}1/override`,
        `/${versionPrefix}2/override`,
        `/${versionPrefix}1/multiple`,
        `/${versionPrefix}2/multiple`,
        `/${versionPrefix}2/multiple-neutral`,
        '/multiple-neutral',
        '/neutral',
        `/${versionPrefix}2/wild/child`,
        '/wild/child',
      ];
      for (const path of paths) {
        await request(app.getHttpServer()).get(path).expect(200);
        await request(app.getHttpServer()).head(path).expect(200);
        await expectMethodMiss(path);
      }
      await request(app.getHttpServer())
        .get(`/${versionPrefix}1/middleware`)
        .expect(200, 'Hello from middleware function!');

      // Exact mounts leave sibling paths and undeclared versions available to
      // routes installed directly on Express after Nest has initialized.
      const express = app.getHttpAdapter().getInstance();
      const rawPaths = [
        `/${versionPrefix}1/hello/raw`,
        `/${versionPrefix}9/hello`,
      ];
      for (const path of rawPaths) {
        express.get(path, (_req, res) => res.send('raw'));
        await request(app.getHttpServer()).get(path).expect(200, 'raw');
      }
    },
  );

  it.each([
    undefined,
    { type: VersioningType.HEADER, header: 'version', defaultVersion: '1' },
    { type: VersioningType.MEDIA_TYPE, key: 'v=', defaultVersion: '1' },
    { type: VersioningType.CUSTOM, extractor: () => '1', defaultVersion: '1' },
  ] as (VersioningOptions | undefined)[])(
    'keeps exclusions unversioned for %j',
    async options => {
      await createApp(options);
      await request(app.getHttpServer())
        .get('/hello')
        .set('version', '1')
        .set('Accept', 'application/json;v=1')
        .expect(200, 'hello');
      await expectMethodMiss('/hello');
    },
  );

  it('should not mistake a prefixed route for an excluded route', async () => {
    const module = await Test.createTestingModule({
      controllers: [ExcludedController],
    }).compile();
    app = module.createNestApplication();
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: VERSION_NEUTRAL,
    });
    app.setGlobalPrefix('api', { exclude: ['api/hello'] });
    const setNotFoundHandler = vi.spyOn(
      app.getHttpAdapter(),
      'setNotFoundHandler',
    );
    await app.init();
    expect(setNotFoundHandler).toHaveBeenCalledWith(
      expect.any(Function),
      'api',
      [],
    );
  });

  it('supports deferred route registration', async () => {
    const module = await Test.createTestingModule({
      controllers: [ExcludedController],
    }).compile();
    app = module.createNestApplication({
      routeResolutionStrategy: 'specificity',
    });
    app.setGlobalPrefix('api', { exclude: ['hello'] });
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    await app.init();
    await request(app.getHttpServer()).get('/v1/hello').expect(200, 'hello');
    await request(app.getHttpServer())
      .post('/v1/hello')
      .expect(404)
      .expect('Content-Type', /json/);
  });

  it('does not confuse a version segment with the global prefix', async () => {
    @Controller()
    class CollisionController {
      @Get('hello')
      @Version([VERSION_NEUTRAL, '1'])
      hello() {
        return 'hello';
      }
    }
    const module = await Test.createTestingModule({
      controllers: [CollisionController],
    }).compile();
    app = module.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI });
    app.setGlobalPrefix('v1', { exclude: ['unrelated'] });
    const handler = vi.spyOn(app.getHttpAdapter(), 'setNotFoundHandler');
    await app.init();
    expect(handler).toHaveBeenCalledWith(expect.any(Function), 'v1', []);
    await request(app.getHttpServer()).get('/v1/hello').expect(200, 'hello');
    await request(app.getHttpServer()).get('/v1/v1/hello').expect(200, 'hello');
  });

  it.each([undefined, '/'])(
    'does not collect exclusions without a global prefix (%j)',
    async prefix => {
      const module = await Test.createTestingModule({
        controllers: [ExcludedController],
      }).compile();
      app = module.createNestApplication();
      app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
      app.setGlobalPrefix(prefix ?? '', { exclude: ['hello'] });
      const setNotFoundHandler = vi.spyOn(
        app.getHttpAdapter(),
        'setNotFoundHandler',
      );
      await app.init();
      expect(setNotFoundHandler).toHaveBeenCalledWith(
        expect.any(Function),
        prefix ?? '',
        [],
      );
      await request(app.getHttpServer()).get('/v1/hello').expect(200, 'hello');
    },
  );
});
