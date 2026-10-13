import { Controller, Get, Logger, UnauthorizedException } from '@nestjs/common';
import {
  ExpressAdapter,
  NestExpressApplication,
} from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { listenOnLoopback } from '../../../_support/listen-on-loopback.js';

@Controller()
class TestController {
  @Get()
  async get() {
    await new Promise(resolve => setImmediate(resolve));
    return 'ok';
  }
}

describe('Request hooks (Express Application)', () => {
  let app: NestExpressApplication;
  let adapter: ExpressAdapter;

  beforeEach(async () => {
    adapter = new ExpressAdapter();
    const module = await Test.createTestingModule({
      controllers: [TestController],
    }).compile();
    app = module.createNestApplication<NestExpressApplication>(adapter, {
      logger: false,
    });
    await listenOnLoopback(app);
  });

  afterEach(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  it('should send a request hook rejection to the exception filters', async () => {
    adapter.setOnRequestHook(async () => {
      throw new UnauthorizedException();
    });

    await request(app.getHttpServer())
      .get('/')
      .timeout(2000)
      .expect(401, { message: 'Unauthorized', statusCode: 401 });
  });

  it('should log a request hook rejection after done() and keep the response', async () => {
    const error = new Error('Late hook failure');
    const logError = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});
    adapter.setOnRequestHook(async (_req, _res, done) => {
      done();
      throw error;
    });

    await request(app.getHttpServer()).get('/').timeout(2000).expect(200, 'ok');
    expect(logError).toHaveBeenCalledExactlyOnceWith(error);
  });
});
