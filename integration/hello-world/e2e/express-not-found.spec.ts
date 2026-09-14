import { ArgumentsHost, HttpException, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

describe('Hello world (express not-found handling)', () => {
  let app: INestApplication;

  afterEach(async () => {
    await app.close();
  });

  it.each([
    { prefix: 'api', path: '/api/missing' },
    { prefix: '/api', path: '/api/missing' },
    { prefix: 'api', path: '/api' },
    { prefix: '/api', path: '/api/' },
    { prefix: 'api/', path: '/api/missing' },
    { prefix: '/api/', path: '/api/missing' },
    { prefix: 'api/', path: '/api' },
    { prefix: '/api/', path: '/api/' },
    { prefix: 'api/v1', path: '/api/v1/missing' },
    { prefix: 'api/v1/', path: '/api/v1/missing' },
    { prefix: undefined, path: '/missing' },
    { prefix: '', path: '/missing' },
    { prefix: '/', path: '/missing' },
    { prefix: '/', path: '/' },
  ])(
    'uses the global exception filter for $path with prefix $prefix',
    async ({ prefix, path }) => {
      const module = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();
      app = module.createNestApplication();
      if (prefix !== undefined) {
        app.setGlobalPrefix(prefix);
      }
      app.useGlobalFilters({
        catch(exception: HttpException, host: ArgumentsHost) {
          host
            .switchToHttp()
            .getResponse()
            .status(exception.getStatus())
            .json({ handledBy: 'nest' });
        },
      });
      await app.init();

      await request(app.getHttpServer())
        .get(path)
        .expect(404)
        .expect({ handledBy: 'nest' });
    },
  );
});
