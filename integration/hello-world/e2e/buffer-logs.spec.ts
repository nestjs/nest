import {
  INestApplication,
  Injectable,
  Logger,
  LoggerService,
  Module,
  OnModuleInit,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module.js';

@Injectable()
class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);

  async onModuleInit() {
    this.logger.warn('Connecting to the database');
    throw new Error('Database unavailable');
  }
}

@Module({ providers: [DatabaseService] })
class FailingModule {}

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
  let app: INestApplication | undefined;
  let logger: CollectingLogger;

  beforeEach(() => {
    logger = new CollectingLogger();
  });

  afterEach(async () => {
    await app?.close();
    app = undefined;
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

  describe('when initialization fails', () => {
    it('should flush them when init() rejects', async () => {
      app = await NestFactory.create(FailingModule, {
        bufferLogs: true,
        logger,
      });

      await app
        .init()
        .catch((err: Error) => new Logger('Bootstrap').error(err.message));

      expect(logger.messages).toContain('Starting Nest application...');
      expect(logger.messages).toContain('Connecting to the database');
      expect(logger.messages).toContain('Database unavailable');
    });

    it('should flush them when a standalone application fails to initialize', async () => {
      await NestFactory.createApplicationContext(FailingModule, {
        bufferLogs: true,
        logger,
      }).catch((err: Error) => new Logger('Bootstrap').error(err.message));

      expect(logger.messages).toContain('Starting Nest application...');
      expect(logger.messages).toContain('Connecting to the database');
      expect(logger.messages).toContain('Database unavailable');
    });
  });
});
