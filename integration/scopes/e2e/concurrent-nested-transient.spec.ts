import {
  CallHandler,
  CanActivate,
  Controller,
  ExecutionContext,
  Get,
  Inject,
  INestApplication,
  Injectable,
  NestInterceptor,
  Scope,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { APP_GUARD, REQUEST } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { listenOnLoopback } from '../../_support/listen-on-loopback.js';

@Injectable({ scope: Scope.TRANSIENT })
class Stopwatch {}

@Injectable({ scope: Scope.TRANSIENT })
class TransientLogger {
  constructor(public readonly stopwatch: Stopwatch) {}
}

@Injectable({ scope: Scope.TRANSIENT })
class RequestInfo {
  constructor(@Inject(REQUEST) public readonly request: unknown) {}
}

@Injectable()
class DenyGuard implements CanActivate {
  constructor(public readonly logger: TransientLogger) {}

  canActivate() {
    return false;
  }
}

// Request-scoped only through a transient provider, which is not known yet
// when the injector starts to resolve the logger for it.
@Injectable()
class AuditService {
  constructor(
    public readonly logger: TransientLogger,
    public readonly info: RequestInfo,
  ) {}
}

@Injectable()
class LoggedGuard implements CanActivate {
  constructor(public readonly logger: TransientLogger) {}

  canActivate() {
    return this.logger.stopwatch instanceof Stopwatch;
  }
}

@Injectable({ scope: Scope.TRANSIENT })
class LoggedInterceptor implements NestInterceptor {
  constructor(public readonly logger: TransientLogger) {}

  intercept(_context: ExecutionContext, next: CallHandler) {
    return next.handle();
  }
}

@Controller()
class AppController {
  @Get()
  get() {
    return 'ok';
  }
}

@Controller()
@UseGuards(LoggedGuard)
@UseInterceptors(LoggedInterceptor)
class LoggedController {
  @Get()
  get() {
    return 'ok';
  }
}

describe('Nested transient providers resolved concurrently', () => {
  let app: INestApplication;

  afterEach(async () => {
    await app.close();
  });

  it('should instantiate a global guard that a request-scoped provider resolves along with', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        Stopwatch,
        TransientLogger,
        RequestInfo,
        DenyGuard,
        { provide: APP_GUARD, useExisting: DenyGuard },
        AuditService,
      ],
    }).compile();
    app = await listenOnLoopback(moduleRef.createNestApplication());

    await request(app.getHttpServer()).get('/').expect(403);
    expect(app.get(DenyGuard).logger.stopwatch).toBeInstanceOf(Stopwatch);
  });

  it('should instantiate the dependencies of a guard that a transient interceptor resolves along with', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [LoggedController],
      providers: [Stopwatch, TransientLogger],
    }).compile();
    app = await listenOnLoopback(moduleRef.createNestApplication());

    await request(app.getHttpServer()).get('/').expect(200, 'ok');
  });
});
