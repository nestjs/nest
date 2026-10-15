import {
  All,
  Controller,
  Get,
  INestApplication,
  Module,
  Query,
  Req,
  Version,
  VERSION_NEUTRAL,
  VersioningOptions,
  VersioningType,
} from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import {
  FastifyAdapter,
  RouteConfig,
  RouteConstraints,
  RouteSchema,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { listenOnLoopback } from '../../_support/listen-on-loopback.js';

@Controller({ path: 'cats', version: '1' })
class CatsV1Controller {
  @All()
  all() {
    return 'v1';
  }
}

@Controller({ path: 'cats', version: '2' })
class CatsV2Controller {
  @All()
  all() {
    return 'v2';
  }
}

@Controller('mixed')
class MixedController {
  @Version('1')
  @All()
  all() {
    return 'all v1';
  }

  @Version('2')
  @Get()
  get() {
    return 'get v2';
  }
}

@Controller('default')
class DefaultVersionController {
  @All()
  all() {
    return 'default';
  }
}

@Controller({ path: 'neutral', version: VERSION_NEUTRAL })
class NeutralController {
  @All()
  all() {
    return 'neutral';
  }
}

@Module({
  controllers: [
    CatsV1Controller,
    CatsV2Controller,
    MixedController,
    DefaultVersionController,
    NeutralController,
  ],
})
class AllMethodModule {}

const versioningOptions: Record<string, VersioningOptions> = {
  URI: { type: VersioningType.URI, defaultVersion: '3' },
  HEADER: {
    type: VersioningType.HEADER,
    header: 'X-API-Version',
    defaultVersion: '3',
  },
  MEDIA_TYPE: {
    type: VersioningType.MEDIA_TYPE,
    key: 'v=',
    defaultVersion: '3',
  },
  CUSTOM: {
    type: VersioningType.CUSTOM,
    extractor: (req: any) => req.headers['x-api-version'] ?? '',
    defaultVersion: '3',
  },
};

describe.each(['express', 'fastify'])('@All() versioning (%s)', adapter => {
  describe.each(Object.keys(versioningOptions))('%s', type => {
    describe.each([
      ['eager', {}],
      ['deferred', { routeConflictPolicy: { duplicate: 'error' } }],
    ] as const)('%s route registration', (_, appOptions) => {
      let app: INestApplication;

      beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
          imports: [AllMethodModule],
        }).compile();
        app = moduleRef.createNestApplication(
          adapter === 'express' ? new ExpressAdapter() : new FastifyAdapter(),
          appOptions,
        );
        app.enableVersioning(versioningOptions[type]);
        await listenOnLoopback(app);
      });

      afterAll(async () => {
        await app.close();
      });

      const send = (
        method: 'get' | 'post' | 'delete',
        path: string,
        version?: string,
      ) => {
        const server = request(app.getHttpServer());
        if (type === 'URI') {
          return server[method](version ? `/v${version}${path}` : path);
        }
        if (!version) {
          return server[method](path);
        }
        return type === 'MEDIA_TYPE'
          ? server[method](path).set('Accept', `application/json;v=${version}`)
          : server[method](path).set('X-API-Version', version);
      };

      it.each(['get', 'post', 'delete'] as const)(
        'routes %s requests to the @All() handler of the requested version',
        async method => {
          await send(method, '/cats', '1').expect(200, 'v1');
          await send(method, '/cats', '2').expect(200, 'v2');
          await send(method, '/cats', '4').expect(404);
          await send(method, '/cats').expect(404);
        },
      );

      it('applies a method-level version to @All() next to a @Get() of another version', async () => {
        await send('get', '/mixed', '1').expect(200, 'all v1');
        await send('post', '/mixed', '1').expect(200, 'all v1');
        await send('get', '/mixed', '2').expect(200, 'get v2');
        await send('post', '/mixed', '2').expect(404);
        await send('get', '/mixed', '4').expect(404);
        await send('get', '/mixed').expect(404);
      });

      it('applies the default version to @All()', async () => {
        await send('post', '/default', '3').expect(200, 'default');
        await send('post', '/default', '1').expect(404);
        await send('post', '/default').expect(404);
      });

      it('serves a version-neutral @All() for any version', async () => {
        await send('post', '/neutral').expect(200, 'neutral');
        if (type !== 'URI') {
          await send('post', '/neutral', '1').expect(200, 'neutral');
        }
      });
    });
  });
});

@Controller('options')
class RouteOptionsController {
  @RouteConfig({ output: 'config' })
  @All('config')
  config(@Req() req: any) {
    return req.routeOptions.config.output;
  }

  @RouteConstraints({ host: 'allowed.example.com' })
  @All('constraints')
  constraints() {
    return 'constraints';
  }

  @RouteSchema({
    querystring: {
      type: 'object',
      properties: { id: { type: 'integer' } },
      required: ['id'],
    },
  })
  @All('schema')
  schema(@Query('id') id: unknown) {
    return typeof id;
  }
}

@Module({ controllers: [RouteOptionsController] })
class RouteOptionsModule {}

describe('@All() route options (fastify)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [RouteOptionsModule],
    }).compile();
    app = moduleRef.createNestApplication(new FastifyAdapter());
    await listenOnLoopback(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('applies @RouteConfig()', () => {
    return request(app.getHttpServer())
      .post('/options/config')
      .expect(200, 'config');
  });

  it('applies @RouteConstraints()', async () => {
    await request(app.getHttpServer())
      .post('/options/constraints')
      .set('Host', 'allowed.example.com')
      .expect(200, 'constraints');
    await request(app.getHttpServer())
      .post('/options/constraints')
      .set('Host', 'other.example.com')
      .expect(404);
  });

  it('applies @RouteSchema()', () => {
    // The querystring schema coerces "id" to an integer
    return request(app.getHttpServer())
      .post('/options/schema?id=1')
      .expect(200, 'number');
  });
});
