import {
  Controller,
  Get,
  NestApplicationOptions,
  Req,
  RequestMethod,
  Version,
  VersioningType,
} from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
  RouteConfig,
  RouteConstraints,
  RouteSchema,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';

@Controller('options')
class RouteOptionsController {
  @RouteConfig({ output: 'from config' })
  @Get('config')
  config(@Req() req: { routeOptions: { config: { output: string } } }) {
    return req.routeOptions.config.output;
  }

  @RouteConstraints({ host: 'api.example.com' })
  @Get('constraints')
  constraints() {
    return 'matched';
  }

  @RouteSchema({
    response: {
      200: { type: 'object', properties: { name: { type: 'string' } } },
    },
  })
  @Get('schema')
  schema() {
    return { name: 'nest', secret: 'not in the schema' };
  }

  @Version('1')
  @Get('versioned')
  v1() {
    return 'v1';
  }

  @Version('2')
  @Get('versioned')
  v2() {
    return 'v2';
  }
}

describe.each<[string, NestApplicationOptions]>([
  ['registered while resolved', {}],
  [
    'registered after resolution',
    { routeConflictPolicy: { duplicate: 'warn' } },
  ],
])('Route triggered hook (Fastify Application, %s)', (_, options) => {
  let app: NestFastifyApplication;
  let triggered: Array<[RequestMethod, string]>;

  beforeAll(async () => {
    const adapter = new FastifyAdapter();
    adapter.setOnRouteTriggered((requestMethod, path) =>
      triggered.push([requestMethod, path]),
    );
    const module = await Test.createTestingModule({
      controllers: [RouteOptionsController],
    }).compile();
    app = module.createNestApplication<NestFastifyApplication>(adapter, {
      logger: false,
      ...options,
    });
    app.enableVersioning({
      type: VersioningType.HEADER,
      header: 'x-api-version',
    });
    await app.init();
  });

  beforeEach(() => {
    triggered = [];
  });

  afterAll(async () => {
    await app.close();
  });

  it('should keep the route config and call the hook', async () => {
    const { statusCode, payload } = await app.inject({
      method: 'GET',
      url: '/options/config',
    });

    expect(statusCode).toBe(200);
    expect(payload).toBe('from config');
    expect(triggered).toEqual([[RequestMethod.GET, '/options/config']]);
  });

  it('should keep the route constraints', async () => {
    const other = await app.inject({
      method: 'GET',
      url: '/options/constraints',
      headers: { host: 'other.example.com' },
    });
    const matching = await app.inject({
      method: 'GET',
      url: '/options/constraints',
      headers: { host: 'api.example.com' },
    });

    expect(other.statusCode).toBe(404);
    expect(matching.payload).toBe('matched');
  });

  it('should keep the route schema', async () => {
    const { payload } = await app.inject({
      method: 'GET',
      url: '/options/schema',
    });

    expect(JSON.parse(payload)).toEqual({ name: 'nest' });
  });

  it('should keep the route version', async () => {
    const v1 = await app.inject({
      method: 'GET',
      url: '/options/versioned',
      headers: { 'x-api-version': '1' },
    });
    const v2 = await app.inject({
      method: 'GET',
      url: '/options/versioned',
      headers: { 'x-api-version': '2' },
    });

    expect(v1.payload).toBe('v1');
    expect(v2.payload).toBe('v2');
  });
});
