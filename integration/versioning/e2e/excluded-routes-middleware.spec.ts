import {
  Controller,
  Get,
  INestApplication,
  MiddlewareConsumer,
  Module,
  RequestMethod,
  VERSION_NEUTRAL,
  Version,
  VersioningType,
} from '@nestjs/common';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { RouterModule } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';

@Controller()
class WildcardController {
  @Get(['hello', 'hello/child'])
  @Version(['1', '2', VERSION_NEUTRAL])
  hello() {
    return 'hello';
  }

  @Get('default')
  default() {
    return 'default';
  }

  @Get('other')
  @Version('1')
  other() {
    return 'other';
  }
}

@Module({ controllers: [WildcardController] })
class WildcardModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req, res, next) => {
        req.middlewareCalls = (req.middlewareCalls ?? 0) + 1;
        res.setHeader('x-middleware-calls', String(req.middlewareCalls));
        next();
      })
      .forRoutes('{*path}');
    consumer
      .apply((_req, res, next) => {
        res.setHeader('x-v2-middleware', 'yes');
        next();
      })
      .forRoutes({ path: '{*path}', version: '2', method: RequestMethod.ALL });
  }
}

describe('Wildcard middleware on URI global prefix exclusions', () => {
  let app: INestApplication;

  afterEach(async () => {
    await app?.close();
  });

  it('should discover exclusions in every module that mounts a shared controller', async () => {
    @Module({ controllers: [WildcardController] })
    class FirstModule {}
    @Module({ controllers: [WildcardController] })
    class SecondModule {}
    const module = await Test.createTestingModule({
      imports: [
        WildcardModule,
        FirstModule,
        SecondModule,
        RouterModule.register([
          { path: 'first', module: FirstModule },
          { path: 'second', module: SecondModule },
        ]),
      ],
    }).compile();
    app = module.createNestApplication();
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.setGlobalPrefix('api', { exclude: ['second/hello'] });
    await app.init();
    for (const path of [
      '/v1/second/hello',
      '/v2/second/hello',
      '/second/hello',
      '/api/v1/first/hello',
    ]) {
      await request(app.getHttpServer())
        .get(path)
        .expect(200, 'hello')
        .expect('x-middleware-calls', '1');
    }
  });

  it.each([
    { adapter: 'express', prefix: undefined, versionPrefix: 'v' },
    { adapter: 'fastify', prefix: undefined, versionPrefix: 'v' },
    { adapter: 'express', prefix: 'version-', versionPrefix: 'version-' },
    { adapter: 'express', prefix: false, versionPrefix: '' },
  ] as { adapter: string; prefix?: string | false; versionPrefix: string }[])(
    'runs once for each excluded version with $adapter and prefix $prefix',
    async ({ adapter, prefix, versionPrefix }) => {
      const module = await Test.createTestingModule({
        imports: [WildcardModule],
      }).compile();
      app =
        adapter === 'fastify'
          ? module.createNestApplication(new FastifyAdapter())
          : module.createNestApplication();
      app.enableVersioning({
        type: VersioningType.URI,
        defaultVersion: '1',
        prefix,
      });
      app.setGlobalPrefix('api', {
        exclude: ['hello', 'hello/{*splat}', 'default'],
      });
      await app.init();
      if (adapter === 'fastify') {
        await app.getHttpAdapter().getInstance().ready();
      }

      for (const version of ['', `/${versionPrefix}1`, `/${versionPrefix}2`]) {
        for (const path of ['hello', 'hello/child']) {
          await request(app.getHttpServer())
            .get(`${version}/${path}`)
            .expect(200, 'hello')
            .expect('x-middleware-calls', '1');
        }
      }
      await request(app.getHttpServer())
        .get(`/${versionPrefix}1/default`)
        .expect(200, 'default')
        .expect('x-middleware-calls', '1');
      await request(app.getHttpServer())
        .get(`/api/${versionPrefix}1/other`)
        .expect(200, 'other')
        .expect('x-middleware-calls', '1');
      await request(app.getHttpServer())
        .get(`/${versionPrefix}2/hello`)
        .expect(200)
        .expect('x-v2-middleware', 'yes');
      const v1 = await request(app.getHttpServer())
        .get(`/${versionPrefix}1/hello`)
        .expect(200);
      expect(v1.headers['x-v2-middleware']).toBeUndefined();

      if (adapter === 'express') {
        const instance = app.getHttpAdapter().getInstance();
        for (const path of ['/outside', `/${versionPrefix}9/hello`]) {
          instance.get(path, (_req, res) => res.send('raw'));
          const response = await request(app.getHttpServer())
            .get(path)
            .expect(200, 'raw');
          expect(response.headers['x-middleware-calls']).toBeUndefined();
        }
      }
    },
  );
});
