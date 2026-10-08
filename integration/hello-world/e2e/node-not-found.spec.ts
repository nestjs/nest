import { NodeAdapter } from '@nestjs/platform-node';
import {
  ArgumentsHost,
  HttpException,
  INestApplication,
  RequestMethod,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

const jsonFilter = {
  catch(exception: HttpException, host: ArgumentsHost) {
    host
      .switchToHttp()
      .getResponse()
      .status(exception.getStatus())
      .json({ handledBy: 'nest' });
  },
};

describe('Hello world (node not-found handling)', () => {
  let app: INestApplication;

  afterEach(async () => {
    await app.close();
  });

  async function createApp(
    configure: (app: INestApplication) => void,
  ): Promise<INestApplication> {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication(new NodeAdapter());
    configure(app);
    app.useGlobalFilters(jsonFilter);
    await app.init();
    return app;
  }

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
      await createApp(app => {
        if (prefix !== undefined) {
          app.setGlobalPrefix(prefix);
        }
      });

      await request(app.getHttpServer())
        .get(path)
        .expect(404)
        .expect({ handledBy: 'nest' });
    },
  );

  // A path taken out of the global prefix is still a path Nest owns, so a
  // request it declares no handler for is an unmatched request rather than
  // something for the framework to answer. The controller declares only GET
  // methods on "hello", which makes POST the miss.
  describe('a method miss on an excluded route', () => {
    it('is answered by the exception filter', async () => {
      await createApp(app =>
        app.setGlobalPrefix('api', { exclude: ['hello'] }),
      );

      await request(app.getHttpServer())
        .post('/hello')
        .expect(404)
        .expect({ handledBy: 'nest' });
    });

    it('is answered when the exclusion names a method', async () => {
      // The exclusion names GET, and GET is the one method that is NOT a miss
      // here. Mounting by the named method would leave every other one to
      // the adapter's own final handler, which is why it mounts for all of
      // them.
      await createApp(app =>
        app.setGlobalPrefix('api', {
          exclude: [{ path: 'hello', method: RequestMethod.GET }],
        }),
      );

      await request(app.getHttpServer())
        .post('/hello')
        .expect(404)
        .expect({ handledBy: 'nest' });
    });

    it('is answered under a wildcard exclusion', async () => {
      await createApp(app =>
        app.setGlobalPrefix('api', { exclude: ['hello/{*splat}'] }),
      );

      await request(app.getHttpServer())
        .post('/hello/async')
        .expect(404)
        .expect({ handledBy: 'nest' });
    });

    it('still serves the excluded route itself', async () => {
      await createApp(app =>
        app.setGlobalPrefix('api', { exclude: ['hello'] }),
      );

      await request(app.getHttpServer()).get('/hello').expect(200);
    });
  });
});
