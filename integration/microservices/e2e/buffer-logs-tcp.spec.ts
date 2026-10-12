import {
  INestApplication,
  INestMicroservice,
  Injectable,
  Logger,
  LoggerService,
  Module,
  OnModuleInit,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

@Module({})
class AppModule {}

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

describe('Buffered logs (microservice)', () => {
  let app: INestMicroservice | INestApplication;
  let logger: CollectingLogger;

  beforeEach(() => {
    logger = new CollectingLogger();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should flush buffered logs on init() when the microservice never listens', async () => {
    app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
      transport: Transport.TCP,
      options: { host: '127.0.0.1', port: 0 },
      bufferLogs: true,
      logger,
    });
    expect(logger.messages).toEqual([]);

    await app.init();

    expect(logger.messages).toContain('Starting Nest application...');
  });

  it('should keep buffering on init() when autoFlushLogs is false', async () => {
    app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
      transport: Transport.TCP,
      options: { host: '127.0.0.1', port: 0 },
      bufferLogs: true,
      autoFlushLogs: false,
      logger,
    });

    await app.init();
    expect(logger.messages).toEqual([]);

    app.flushLogs();
    expect(logger.messages).toContain('Starting Nest application...');
  });

  it('should flush buffered logs of a hybrid application on init()', async () => {
    const hybrid = await NestFactory.create(AppModule, {
      bufferLogs: true,
      logger,
    });
    app = hybrid;
    hybrid.connectMicroservice<MicroserviceOptions>({
      transport: Transport.TCP,
      options: { host: '127.0.0.1', port: 0 },
    });
    expect(logger.messages).toEqual([]);

    await hybrid.init();

    expect(logger.messages).toContain('Nest application successfully started');
  });

  describe('when initialization fails', () => {
    const createFailingMicroservice = () =>
      NestFactory.createMicroservice<MicroserviceOptions>(FailingModule, {
        transport: Transport.TCP,
        options: { host: '127.0.0.1', port: 0 },
        bufferLogs: true,
        logger,
      });

    it('should flush buffered logs when init() rejects', async () => {
      app = await createFailingMicroservice();

      await app
        .init()
        .catch((err: Error) => new Logger('Bootstrap').error(err.message));

      expect(logger.messages).toContain('Starting Nest application...');
      expect(logger.messages).toContain('Connecting to the database');
      expect(logger.messages).toContain('Database unavailable');
    });

    it('should flush buffered logs when listen() rejects', async () => {
      app = await createFailingMicroservice();

      await app
        .listen()
        .catch((err: Error) => new Logger('Bootstrap').error(err.message));

      expect(logger.messages).toContain('Starting Nest application...');
      expect(logger.messages).toContain('Connecting to the database');
      expect(logger.messages).toContain('Database unavailable');
    });
  });
});
