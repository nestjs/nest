import {
  All,
  Controller,
  Get,
  INestApplication,
  Version,
  VERSION_NEUTRAL,
  VersioningOptions,
  VersioningType,
} from '@nestjs/common';
import { FastifyAdapter } from '@nestjs/platform-fastify';
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

@Controller({ path: 'neutral', version: VERSION_NEUTRAL })
class NeutralController {
  @All()
  all() {
    return 'neutral';
  }
}

describe.each<
  [string, VersioningOptions, (version: string) => [string, string]]
>([
  [
    'header',
    { type: VersioningType.HEADER, header: 'X-API-Version' },
    version => ['X-API-Version', version],
  ],
  [
    'media type',
    { type: VersioningType.MEDIA_TYPE, key: 'v=' },
    version => ['Accept', `application/json;v=${version}`],
  ],
  [
    'custom',
    {
      type: VersioningType.CUSTOM,
      extractor: (req: any) => req.headers['x-api-version'] ?? '',
    },
    version => ['X-API-Version', version],
  ],
])('@All() versioning (Fastify, %s)', (_, versioningOptions, versionHeader) => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [
        CatsV1Controller,
        CatsV2Controller,
        MixedController,
        NeutralController,
      ],
    }).compile();
    app = moduleRef.createNestApplication(new FastifyAdapter());
    app.enableVersioning(versioningOptions);
    await listenOnLoopback(app);
  });

  afterAll(async () => {
    await app.close();
  });

  const send = (method: 'get' | 'post', path: string, version?: string) => {
    const req = request(app.getHttpServer())[method](path);
    return version ? req.set(...versionHeader(version)) : req;
  };

  it('should route each version to its @All() handler', async () => {
    for (const method of ['get', 'post'] as const) {
      await send(method, '/cats', '1').expect(200, 'v1');
      await send(method, '/cats', '2').expect(200, 'v2');
      await send(method, '/cats', '3').expect(404);
      await send(method, '/cats').expect(404);
    }
  });

  it('should keep a @Get() of another version on the same path', async () => {
    await send('post', '/mixed', '1').expect(200, 'all v1');
    await send('get', '/mixed', '2').expect(200, 'get v2');
    await send('post', '/mixed', '2').expect(404);
  });

  it('should serve a version-neutral @All() for any version', async () => {
    await send('post', '/neutral').expect(200, 'neutral');
    await send('post', '/neutral', '1').expect(200, 'neutral');
  });
});
