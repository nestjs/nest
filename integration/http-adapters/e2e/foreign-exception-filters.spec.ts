import {
  type ArgumentsHost,
  Catch,
  Controller,
  type ExceptionFilter,
  Get,
  HttpException,
  type INestApplication,
  Module,
  UseGuards,
} from '@nestjs/common';
import { throwError } from 'rxjs';
import request from 'supertest';
import { adapters, createApp } from '../src/adapters.js';

// The shape of the GraphQL exception filter in the docs: it returns the
// error for GraphQL to report
@Catch(HttpException)
class GraphQLStyleFilter implements ExceptionFilter {
  catch(exception: HttpException) {
    return exception;
  }
}

// An async RPC exception filter, as a hybrid application shares it with its
// HTTP routes ("inheritAppConfig")
@Catch()
class AsyncRpcStyleFilter implements ExceptionFilter {
  async catch() {
    await new Promise(resolve => setImmediate(resolve));
    return throwError(() => ({ status: 'error', message: 'Internal error' }));
  }
}

// An HTTP filter that answers after awaiting something
@Catch()
class AsyncHttpFilter implements ExceptionFilter {
  async catch(_exception: unknown, host: ArgumentsHost) {
    await new Promise(resolve => setImmediate(resolve));
    const response = host.switchToHttp().getResponse();
    const raw = response.raw ?? response;
    raw.statusCode = 418;
    raw.setHeader('Content-Type', 'text/plain');
    raw.end('from the filter');
  }
}

@Controller()
class FiltersController {
  @Get('guarded')
  @UseGuards({ canActivate: () => false })
  guarded() {}

  @Get('fails')
  fails() {
    throw new Error('internal detail');
  }
}

@Module({ controllers: [FiltersController] })
class FiltersModule {}

describe.each(adapters('express', 'fastify', 'node'))(
  'Global exception filters for another context (%s)',
  name => {
    let app: INestApplication;
    const get = (path: string) =>
      request(app.getHttpServer()).get(path).timeout(3000);

    afterEach(async () => {
      await app.close();
    });

    it('should answer the HTTP errors a GraphQL-style filter returns', async () => {
      app = await createApp(name, FiltersModule, app =>
        app.useGlobalFilters(new GraphQLStyleFilter()),
      );

      await get('/missing').expect(404);
      await get('/guarded').expect(403);
    });

    it('should answer the HTTP errors an async RPC-style filter leaves', async () => {
      app = await createApp(name, FiltersModule, app =>
        app.useGlobalFilters(new AsyncRpcStyleFilter()),
      );

      await get('/missing').expect(404);
      await get('/guarded').expect(403);
      await get('/fails').expect(500, {
        statusCode: 500,
        message: 'Internal server error',
      });
    });

    it('should leave the answer to an async filter that answers', async () => {
      app = await createApp(name, FiltersModule, app =>
        app.useGlobalFilters(new AsyncHttpFilter()),
      );

      await get('/missing').expect(418, 'from the filter');
      await get('/fails').expect(418, 'from the filter');
    });
  },
);
