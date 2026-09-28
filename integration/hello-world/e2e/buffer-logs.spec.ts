import { INestApplication, LoggerService } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module.js';

class CollectingLogger implements LoggerService {
  readonly messages: string[] = [];

  log(message: any) {
    this.messages.push(String(message));
  }
  error(message: any) {
    this.messages.push(String(message));
  }
  warn(message: any) {
    this.messages.push(String(message));
  }
}

describe('Buffered logs', () => {
  let app: INestApplication;
  let logger: CollectingLogger;

  beforeEach(() => {
    logger = new CollectingLogger();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should flush buffered logs on init() when the app never listens', async () => {
    app = await NestFactory.create(AppModule, { bufferLogs: true, logger });
    expect(logger.messages).toEqual([]);

    await app.init();

    expect(logger.messages).toContain('Starting Nest application...');
    expect(logger.messages).toContain('Nest application successfully started');
  });

  it('should flush them to a logger set with useLogger() before init()', async () => {
    app = await NestFactory.create(AppModule, { bufferLogs: true });
    app.useLogger(logger);
    expect(logger.messages).toEqual([]);

    await app.init();

    expect(logger.messages).toContain('Starting Nest application...');
  });

  it('should keep buffering when autoFlushLogs is false', async () => {
    app = await NestFactory.create(AppModule, {
      bufferLogs: true,
      autoFlushLogs: false,
      logger,
    });

    await app.init();
    expect(logger.messages).toEqual([]);

    app.flushLogs();
    expect(logger.messages).toContain('Nest application successfully started');
  });
});
