import {
  ArgumentsHost,
  Controller,
  ExceptionFilter,
  Get,
  HttpException,
  INestApplication,
  Module,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import type { Response } from 'express';
import request from 'supertest';

@Controller('known')
class TestController {
  @Get()
  get() {
    return { ok: true };
  }
}

@Module({ controllers: [TestController] })
class TestModule {}

class NotFoundFilter implements ExceptionFilter {
  constructor(private readonly handledBy = 'nest') {}

  catch(exception: HttpException, host: ArgumentsHost) {
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(exception.getStatus())
      .json({ handledBy: this.handledBy });
  }
}

describe('ExpressAdapter not-found handling', () => {
  const applications: INestApplication[] = [];

  afterEach(async () => {
    await Promise.all(applications.splice(0).map(app => app.close()));
  });

  const createApplication = async (
    prefix?: string,
    adapter = new ExpressAdapter(),
    handledBy = 'nest',
  ) => {
    const app = await NestFactory.create(TestModule, adapter, {
      logger: false,
    });
    applications.push(app);
    if (prefix !== undefined) {
      app.setGlobalPrefix(prefix);
    }
    app.useGlobalFilters(new NotFoundFilter(handledBy));
    await app.init();
    return app;
  };

  it.each([
    { prefix: 'api', path: '/api/missing' },
    { prefix: '/api', path: '/api/missing' },
    { prefix: 'api', path: '/api' },
    { prefix: '/api', path: '/api/' },
    { prefix: 'api/v1', path: '/api/v1/missing' },
    { prefix: undefined, path: '/missing' },
  ])(
    'uses the global exception filter with prefix $prefix',
    async ({ prefix, path }) => {
      const app = await createApplication(prefix);

      await request(app.getHttpServer())
        .get(path)
        .expect(404)
        .expect({ handledBy: 'nest' });
    },
  );

  it.each(['api', '/api'])(
    'preserves routes and not-found ownership on a shared adapter with prefix %s',
    async prefix => {
      const adapter = new ExpressAdapter();
      await createApplication(undefined, adapter, 'root');
      const app = await createApplication(prefix, adapter, 'prefixed');

      await request(app.getHttpServer())
        .get('/api/known')
        .expect(200)
        .expect({ ok: true });
      await request(app.getHttpServer())
        .get('/known')
        .expect(200)
        .expect({ ok: true });
      await request(app.getHttpServer())
        .get('/api/missing')
        .expect(404)
        .expect({ handledBy: 'prefixed' });
      await request(app.getHttpServer())
        .get('/apiary/missing')
        .expect(404)
        .expect({ handledBy: 'root' });
    },
  );
});
