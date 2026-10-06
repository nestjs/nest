import {
  ArgumentsHost,
  BadRequestException,
  CallHandler,
  CanActivate,
  Catch,
  Controller,
  ExceptionFilter,
  ExecutionContext,
  Get,
  Injectable,
  Module,
  NestInterceptor,
  PipeTransform,
  Query,
  Scope,
} from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';

describe('Global enhancers with transient scope on static controllers', () => {
  const calls: string[] = [];

  @Injectable({ scope: Scope.TRANSIENT })
  class TransientDenyGuard implements CanActivate {
    canActivate() {
      calls.push('guard');
      return false;
    }
  }

  @Injectable({ scope: Scope.TRANSIENT })
  class TransientInterceptor implements NestInterceptor {
    intercept(_context: ExecutionContext, next: CallHandler) {
      calls.push('interceptor');
      return next.handle();
    }
  }

  @Injectable({ scope: Scope.TRANSIENT })
  class TransientPipe implements PipeTransform {
    transform(value: unknown) {
      calls.push('pipe');
      return value;
    }
  }

  @Catch()
  @Injectable({ scope: Scope.TRANSIENT })
  class TransientFilter implements ExceptionFilter {
    catch(_exception: unknown, host: ArgumentsHost) {
      calls.push('filter');
      host.switchToHttp().getResponse().status(418).send('filtered');
    }
  }

  @Controller()
  class CatsController {
    @Get('cats')
    findAll(@Query('name') name?: string) {
      calls.push('handler');
      if (name === 'throw') {
        throw new BadRequestException();
      }
      return 'cats';
    }
  }

  async function createServer(
    provide: symbol | string,
    useClass: new (...args: any[]) => unknown,
  ) {
    @Module({
      controllers: [CatsController],
      providers: [{ provide, useClass }],
    })
    class AppModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const app = moduleRef.createNestApplication();
    await app.init();
    return app;
  }

  beforeEach(() => {
    calls.length = 0;
  });

  it('should run a transient global guard', async () => {
    const app = await createServer(APP_GUARD, TransientDenyGuard);

    await request(app.getHttpServer()).get('/cats').expect(403);

    expect(calls).toEqual(['guard']);
    await app.close();
  });

  it('should run a transient global interceptor', async () => {
    const app = await createServer(APP_INTERCEPTOR, TransientInterceptor);

    await request(app.getHttpServer()).get('/cats').expect(200);

    expect(calls).toEqual(['interceptor', 'handler']);
    await app.close();
  });

  it('should run a transient global pipe', async () => {
    const app = await createServer(APP_PIPE, TransientPipe);

    await request(app.getHttpServer()).get('/cats?name=tom').expect(200);

    expect(calls).toContain('pipe');
    await app.close();
  });

  it('should run a transient global exception filter', async () => {
    const app = await createServer(APP_FILTER, TransientFilter);

    await request(app.getHttpServer()).get('/cats?name=throw').expect(418);

    expect(calls).toEqual(['handler', 'filter']);
    await app.close();
  });
});
