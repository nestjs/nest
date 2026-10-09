import {
  Controller,
  Get,
  INestApplication,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { CapturingLogger, Test } from '@nestjs/testing';
import request from 'supertest';
import { listenOnLoopback } from '../../_support/listen-on-loopback.js';

@Injectable()
class OrdersService implements OnModuleInit {
  private readonly logger = new Logger(OrdersService.name);

  onModuleInit() {
    this.logger.log('Orders service ready', { region: 'eu' });
  }

  findAll() {
    this.logger.debug('Listing orders');
    return [];
  }

  fail(): never {
    throw new Error('Database unavailable');
  }
}

@Controller('orders')
class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findAll() {
    return this.ordersService.findAll();
  }

  @Get('broken')
  broken() {
    return this.ordersService.fail();
  }
}

describe('CapturingLogger', () => {
  let app: INestApplication;
  let logger: CapturingLogger;

  beforeEach(() => {
    logger = new CapturingLogger();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('when set on the testing module builder', () => {
    beforeEach(async () => {
      const moduleRef = await Test.createTestingModule({
        controllers: [OrdersController],
        providers: [OrdersService],
      })
        .setLogger(logger)
        .compile();

      app = moduleRef.createNestApplication();
      await listenOnLoopback(app);
    });

    it('should capture the framework logs', () => {
      logger.assertLogged({
        level: 'log',
        context: 'RouterExplorer',
        message: /\{\/orders, GET\} route/,
      });
      logger.assertLogged({
        context: 'NestApplication',
        message: 'Nest application successfully started',
      });
    });

    it('should capture the logs of "Logger" instances in providers', async () => {
      logger.assertLogged({
        level: 'log',
        context: 'OrdersService',
        message: 'Orders service ready',
        params: { region: 'eu' },
      });

      await request(app.getHttpServer()).get('/orders').expect(200);

      logger.assertLogged({
        level: 'debug',
        context: 'OrdersService',
        message: 'Listing orders',
      });
    });

    it('should capture unhandled exceptions', async () => {
      logger.clear();

      await request(app.getHttpServer()).get('/orders/broken').expect(500);

      const entry = logger.assertLogged({
        level: 'error',
        context: 'ExceptionsHandler',
      });
      expect(entry.message).toBe('Database unavailable');
      expect(entry.error).toBeInstanceOf(Error);
    });
  });

  describe('when set with "useLogger"', () => {
    it('should capture the logs from then on', async () => {
      const moduleRef = await Test.createTestingModule({
        controllers: [OrdersController],
        providers: [OrdersService],
      }).compile();

      app = moduleRef.createNestApplication();
      app.useLogger(logger);
      await listenOnLoopback(app);

      logger.assertLogged({ context: 'OrdersService' });
      logger.assertLogged({ context: 'RoutesResolver' });
      // Instances were created during compile(), before the logger was set.
      logger.assertNotLogged({ context: 'InstanceLoader' });
    });
  });
});
