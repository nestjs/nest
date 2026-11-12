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
import * as request from 'supertest';

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
    await app.listen(0, '127.0.0.1');
  };

  afterEach(async () => {
    await app.close();
  });

  for (const exclusions of [[], ['public']]) {
    it(`should apply them with the exclusions ${JSON.stringify(exclusions)}`, async () => {
      await createApp(exclusions);
      await request(app.getHttpServer())
        .get('/private')
        .expect(403, 'filtered');
    });
  }
});
