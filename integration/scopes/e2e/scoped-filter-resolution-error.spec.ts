import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  Controller,
  ExceptionFilter,
  Get,
  HttpException,
  Inject,
  INestApplication,
  Injectable,
  NotFoundException,
  Scope,
  UseFilters,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as request from 'supertest';

@Injectable()
class FailureLog {
  readonly entries: string[] = [];

  record(entry: string) {
    this.entries.push(entry);
  }
}

// Fails to resolve for an unknown tenant
@Injectable({ scope: Scope.REQUEST })
class Tenant {
  readonly name: string;

  constructor(@Inject(REQUEST) req: { headers: Record<string, string> }) {
    if (req.headers['x-tenant'] !== 'acme') {
      throw new BadRequestException('Unknown tenant');
    }
    this.name = 'acme';
  }
}

@Injectable({ scope: Scope.REQUEST })
@Catch(HttpException)
class RequestScopedFilter implements ExceptionFilter {
  constructor(private readonly log: FailureLog) {}

  async catch(exception: HttpException, host: ArgumentsHost) {
    await Promise.resolve();
    this.log.record(exception.message);
    host
      .switchToHttp()
      .getResponse()
      .status(exception.getStatus())
      .json({ handledBy: 'RequestScopedFilter' });
  }
}

@Injectable({ scope: Scope.TRANSIENT })
@Catch(HttpException)
class TransientFilter implements ExceptionFilter {
  constructor(private readonly log: FailureLog) {}

  catch(exception: HttpException, host: ArgumentsHost) {
    this.log.record(exception.message);
    host
      .switchToHttp()
      .getResponse()
      .status(exception.getStatus())
      .json({ handledBy: 'TransientFilter' });
  }
}

@Catch()
class UnscopedFilter implements ExceptionFilter {
  constructor(private readonly log: FailureLog) {}

  catch(exception: Error, host: ArgumentsHost) {
    this.log.record(exception.message);
    host
      .switchToHttp()
      .getResponse()
      .status(503)
      .json({ handledBy: 'UnscopedFilter' });
  }
}

@Controller('scoped')
@UseFilters(RequestScopedFilter)
class ScopedFilterController {
  constructor(private readonly tenant: Tenant) {}

  @Get()
  find() {
    throw new NotFoundException(`No invoices for ${this.tenant.name}`);
  }
}

@Controller('unscoped')
@UseFilters(UnscopedFilter)
class UnscopedFilterController {
  constructor(private readonly tenant: Tenant) {}

  @Get()
  find() {
    throw new NotFoundException(`No invoices for ${this.tenant.name}`);
  }
}

@Controller('transient')
@UseFilters(TransientFilter)
class TransientFilterController {
  @Get()
  find() {
    throw new NotFoundException('No invoices');
  }
}

describe('Exception filters of a request-scoped controller that fails to resolve', () => {
  let app: INestApplication;
  let log: FailureLog;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [
        ScopedFilterController,
        UnscopedFilterController,
        TransientFilterController,
      ],
      providers: [FailureLog, Tenant],
    }).compile();

    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
    log = app.get(FailureLog);
  });

  afterEach(async () => {
    await app.close();
  });

  it('should run a request-scoped filter of a controller that resolves', async () => {
    await request(app.getHttpServer())
      .get('/scoped')
      .set('x-tenant', 'acme')
      .expect(404, { handledBy: 'RequestScopedFilter' });
    expect(log.entries).to.deep.equal(['No invoices for acme']);
  });

  it('should leave the error to the built-in filter instead of a request-scoped filter that was not created', async () => {
    await request(app.getHttpServer())
      .get('/scoped')
      .set('x-tenant', 'unknown')
      .timeout(3000)
      .expect(400, {
        statusCode: 400,
        message: 'Unknown tenant',
        error: 'Bad Request',
      });
    expect(log.entries).to.deep.equal([]);

    // The application still answers
    await request(app.getHttpServer())
      .get('/scoped')
      .set('x-tenant', 'acme')
      .expect(404, { handledBy: 'RequestScopedFilter' });
  });

  it('should still run a filter without a scope for the error', async () => {
    await request(app.getHttpServer())
      .get('/unscoped')
      .set('x-tenant', 'unknown')
      .expect(503, { handledBy: 'UnscopedFilter' });
    expect(log.entries).to.deep.equal(['Unknown tenant']);
  });

  it('should run a transient filter of a controller without a scope', async () => {
    await request(app.getHttpServer())
      .get('/transient')
      .expect(404, { handledBy: 'TransientFilter' });
    expect(log.entries).to.deep.equal(['No invoices']);
  });
});
