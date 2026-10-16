import {
  Controller,
  Get,
  INestApplication,
  Injectable,
  MiddlewareConsumer,
  Module,
  NestMiddleware,
  NestModule,
  Scope,
} from '@nestjs/common';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as request from 'supertest';

@Injectable()
class TokenService {
  isValid(token: string | undefined) {
    return token === 'secret';
  }
}

@Injectable({ scope: Scope.TRANSIENT })
class TransientAuthMiddleware implements NestMiddleware {
  static COUNTER = 0;

  constructor(private readonly tokenService: TokenService) {
    TransientAuthMiddleware.COUNTER++;
  }

  use(req: any, res: any, next: () => void) {
    if (!this.tokenService.isValid(req.headers['x-token'])) {
      res.statusCode = 401;
      return res.end('unauthorized');
    }
    next();
  }
}

@Controller('cats')
class CatsController {
  @Get()
  findAll() {
    return 'cats';
  }
}

@Module({
  controllers: [CatsController],
  providers: [TokenService],
})
class CatsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TransientAuthMiddleware).forRoutes(CatsController);
  }
}

describe('Transient scope (middleware)', () => {
  for (const [name, createAdapter] of [
    ['Express', () => undefined],
    ['Fastify', () => new FastifyAdapter()],
  ] as const) {
    describe(`with the ${name} adapter`, () => {
      let app: INestApplication;

      beforeEach(async () => {
        TransientAuthMiddleware.COUNTER = 0;
        const module = await Test.createTestingModule({
          imports: [CatsModule],
        }).compile();

        const adapter = createAdapter();
        app = adapter
          ? module.createNestApplication(adapter)
          : module.createNestApplication();
        await app.init();
        if (app.getHttpAdapter().getType() === 'fastify') {
          await app.getHttpAdapter().getInstance().ready();
        }
      });

      afterEach(async () => {
        await app.close();
      });

      it('should run the middleware', async () => {
        await request(app.getHttpServer())
          .get('/cats')
          .expect(401, 'unauthorized');
        await request(app.getHttpServer())
          .get('/cats')
          .set('x-token', 'secret')
          .expect(200, 'cats');
      });

      it('should create the middleware for each request', async () => {
        await request(app.getHttpServer()).get('/cats').expect(401);
        await request(app.getHttpServer()).get('/cats').expect(401);

        expect(TransientAuthMiddleware.COUNTER).to.equal(2);
      });
    });
  }
});
