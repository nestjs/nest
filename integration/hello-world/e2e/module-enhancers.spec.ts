import {
  ArgumentsHost,
  CallHandler,
  CanActivate,
  Catch,
  Controller,
  ExceptionFilter,
  ExecutionContext,
  Get,
  INestApplication,
  Injectable,
  Module,
  NestInterceptor,
  Param,
  PipeTransform,
  Scope,
  UseGuards,
} from '@nestjs/common';
import {
  APP_GUARD,
  MODULE_FILTER,
  MODULE_GUARD,
  MODULE_INTERCEPTOR,
  MODULE_PIPE,
} from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { map } from 'rxjs/operators';
import request from 'supertest';
import { listenOnLoopback } from '../../_support/listen-on-loopback.js';

// Records the order in which guards run for the ordering test below.
const ORDER: string[] = [];

@Injectable()
class DenyGuard implements CanActivate {
  canActivate() {
    return false;
  }
}

@Injectable({ scope: Scope.REQUEST })
class RequestScopedDenyGuard implements CanActivate {
  canActivate() {
    return false;
  }
}

function orderGuard(label: string): CanActivate {
  return {
    canActivate: () => {
      ORDER.push(label);
      return true;
    },
  };
}

@Injectable()
class OrderMethodGuard implements CanActivate {
  canActivate() {
    ORDER.push('method');
    return true;
  }
}

@Injectable()
class PrefixInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(map(data => `intercepted:${data}`));
  }
}

@Injectable()
class SuffixPipe implements PipeTransform {
  transform(value: string) {
    return `${value}-piped`;
  }
}

@Catch()
@Injectable()
class TeapotFilter implements ExceptionFilter {
  catch(_error: unknown, host: ArgumentsHost) {
    host.switchToHttp().getResponse().status(418).send('scoped-handled');
  }
}

@Controller('guarded')
class GuardedController {
  @Get()
  read() {
    return 'ok';
  }
}

@Controller('plain')
class PlainController {
  @Get()
  read() {
    return 'ok';
  }
}

@Controller('scoped')
class ScopedController {
  @Get()
  read() {
    return 'ok';
  }

  @Get('echo/:value')
  echo(@Param('value') value: string) {
    return value;
  }

  @Get('fail')
  fail() {
    throw new Error('boom');
  }

  @Get('order')
  @UseGuards(OrderMethodGuard)
  order() {
    return 'ok';
  }
}

@Controller('other')
class OtherController {
  @Get()
  read() {
    return 'ok';
  }

  @Get('echo/:value')
  echo(@Param('value') value: string) {
    return value;
  }

  @Get('fail')
  fail() {
    throw new Error('boom');
  }
}

@Module({
  controllers: [GuardedController],
  providers: [{ provide: MODULE_GUARD, useValue: new DenyGuard() }],
})
class GuardedModule {}

// Imports GuardedModule: its own controller must NOT inherit the
// MODULE_GUARD — scoping is shallow and never reaches into importers.
@Module({
  imports: [GuardedModule],
  controllers: [PlainController],
})
class PlainModule {}

@Module({
  controllers: [ScopedController],
  providers: [
    { provide: MODULE_GUARD, useValue: orderGuard('module') },
    { provide: MODULE_INTERCEPTOR, useClass: PrefixInterceptor },
    { provide: MODULE_PIPE, useClass: SuffixPipe },
    { provide: MODULE_FILTER, useClass: TeapotFilter },
    OrderMethodGuard,
  ],
})
class ScopedModule {}

@Module({
  controllers: [OtherController],
})
class OtherModule {}

@Module({
  imports: [ScopedModule, OtherModule, PlainModule],
  providers: [{ provide: APP_GUARD, useValue: orderGuard('app') }],
})
class AppModule {}

@Controller('req')
class ReqScopedController {
  @Get()
  read() {
    return 'ok';
  }
}

@Controller('req-other')
class ReqOtherController {
  @Get()
  read() {
    return 'ok';
  }
}

@Module({
  controllers: [ReqScopedController],
  providers: [{ provide: MODULE_GUARD, useClass: RequestScopedDenyGuard }],
})
class ReqScopedModule {}

@Module({
  controllers: [ReqOtherController],
})
class ReqOtherModule {}

@Module({
  imports: [ReqScopedModule, ReqOtherModule],
})
class ReqScopedAppModule {}

const createApp = async (module: any) => {
  const moduleRef = await Test.createTestingModule({
    imports: [module],
  }).compile();
  const app = moduleRef.createNestApplication();
  await listenOnLoopback(app);
  return app;
};

describe('Module-scoped enhancers (MODULE_*)', () => {
  let app: INestApplication;

  afterEach(async () => {
    await app?.close();
  });

  describe('MODULE_GUARD', () => {
    it('should guard only the controllers of the declaring module', async () => {
      app = await createApp(AppModule);

      await request(app.getHttpServer()).get('/guarded').expect(403);
      await request(app.getHttpServer()).get('/plain').expect(200).expect('ok');
    });

    it('should not leak into a module that imports the declaring module', async () => {
      app = await createApp(AppModule);

      // PlainModule imports GuardedModule, yet its controller stays open.
      await request(app.getHttpServer()).get('/plain').expect(200).expect('ok');
    });

    it('should apply a request-scoped module guard only to the declaring module', async () => {
      app = await createApp(ReqScopedAppModule);

      await request(app.getHttpServer()).get('/req').expect(403);
      await request(app.getHttpServer())
        .get('/req-other')
        .expect(200)
        .expect('ok');
    });
  });

  describe('MODULE_INTERCEPTOR', () => {
    it('should intercept only the controllers of the declaring module', async () => {
      app = await createApp(AppModule);

      await request(app.getHttpServer())
        .get('/scoped')
        .expect(200)
        .expect('intercepted:ok');
      await request(app.getHttpServer()).get('/other').expect(200).expect('ok');
    });
  });

  describe('MODULE_PIPE', () => {
    it('should transform params only for the controllers of the declaring module', async () => {
      app = await createApp(AppModule);

      await request(app.getHttpServer())
        .get('/scoped/echo/abc')
        .expect(200)
        // The module pipe appends "-piped"; the module interceptor then
        // prefixes the result, as both apply to this module.
        .expect('intercepted:abc-piped');
      await request(app.getHttpServer())
        .get('/other/echo/abc')
        .expect(200)
        .expect('abc');
    });
  });

  describe('MODULE_FILTER', () => {
    it('should handle errors only from the controllers of the declaring module', async () => {
      app = await createApp(AppModule);

      await request(app.getHttpServer())
        .get('/scoped/fail')
        .expect(418)
        .expect('scoped-handled');
      await request(app.getHttpServer()).get('/other/fail').expect(500);
    });
  });

  describe('ordering and APP_* behaviour', () => {
    it('should run APP_* guards before MODULE_* guards before @UseGuards()', async () => {
      app = await createApp(AppModule);
      ORDER.length = 0;

      await request(app.getHttpServer())
        .get('/scoped/order')
        .expect(200)
        // The module interceptor prefixes the response of this module.
        .expect('intercepted:ok');

      expect(ORDER).toEqual(['app', 'module', 'method']);
    });

    it('should keep APP_GUARD global while MODULE_GUARD stays scoped', async () => {
      app = await createApp(AppModule);
      ORDER.length = 0;

      await request(app.getHttpServer()).get('/other').expect(200).expect('ok');

      // The global guard ran; the module guard of ScopedModule did not.
      expect(ORDER).toEqual(['app']);
    });
  });
});
