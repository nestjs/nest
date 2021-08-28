import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { loggerProvider } from '../src/resolve-scoped/logger.provider';
import { LoggerService } from '../src/resolve-scoped/logger.service';
import { RequestLoggerService } from '../src/resolve-scoped/request-logger.service';

describe('Resolve method', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [LoggerService, loggerProvider, RequestLoggerService],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  it('should resolve transient logger', async () => {
    const transientLogger = await app.resolve(LoggerService);
    expect(transientLogger.logger).toEqual({
      logger: true,
    });
  });

  it('should resolve request-scoped logger', async () => {
    const requestScoped = await app.resolve(RequestLoggerService);

    expect(requestScoped.loggerService).toBeInstanceOf(LoggerService);
    expect(requestScoped.loggerService.logger).toEqual({
      logger: true,
    });
  });

   afterAll(async () => {
    await app.close();
  });
});
