import {
  ArgumentsHost,
  Catch,
  Controller,
  ExceptionFilter,
  ForbiddenException,
  Get,
  INestApplication,
  Injectable,
  MiddlewareConsumer,
  Module,
  NestMiddleware,
  UseFilters,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { listenOnLoopback } from '../../_support/listen-on-loopback.js';

@Catch(ForbiddenException)
class ForbiddenFilter implements ExceptionFilter {
  catch(exception: ForbiddenException, host: ArgumentsHost) {
    host.switchToHttp().getResponse().status(403).send('filtered');
  }
}

@Injectable()
class GuardMiddleware implements NestMiddleware {
  @UseFilters(new ForbiddenFilter())
  use() {
    throw new ForbiddenException();
  }
}

@Controller()
class TestController {
  @Get('private')
  private() {
    return 'private';
  }

  @Get('public')
  public() {
    return 'public';
  }
}

describe('Middleware - exception filters bound to "use()"', () => {
  let app: INestApplication;

  const createApp = async (exclusions: string[]) => {
    @Module({ controllers: [TestController] })
    class TestModule {
      configure(consumer: MiddlewareConsumer) {
        consumer
          .apply(GuardMiddleware)
          .exclude(...exclusions)
          .forRoutes(TestController);
      }
    }

    app = (
      await Test.createTestingModule({ imports: [TestModule] }).compile()
    ).createNestApplication();
    await listenOnLoopback(app);
  };

  afterEach(async () => {
    await app.close();
  });

  it.each([[[]], [['public']]])(
    'should apply them with the exclusions %j',
    async exclusions => {
      await createApp(exclusions);
      await request(app.getHttpServer())
        .get('/private')
        .expect(403, 'filtered');
    },
  );
});
