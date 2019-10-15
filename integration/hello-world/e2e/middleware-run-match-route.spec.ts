import {
  Controller,
  Get,
  INestApplication,
  Injectable,
  MiddlewareConsumer,
  NestMiddleware,
  Module,
} from '@nestjs/common';
import { Test } from '../../../packages/testing';
import * as request from 'supertest';
import { expect } from 'chai';

let number: number = 0;
let applyRoute: string;
@Injectable()
class Middleware implements NestMiddleware {
  use(req, res, next) {
  	number++;
  	applyRoute = req.route.path;
    next();
  }
}

@Controller('/a')
class TestController {
  @Get('/test')
  testA() {
    return '';
  }
  @Get('/:id')
  testB() {
    return '';
  }
}

@Module({
  controllers: [TestController],
})
class TestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(Middleware).forRoutes(TestController);
  }
}

describe('Middleware (run match route)', () => {
  let app: INestApplication;

  beforeEach(async () => {
		number = 0;
		applyRoute = '';
		app = (await Test.createTestingModule({
      imports: [TestModule],
    }).compile()).createNestApplication();

    await app.init();
  });

  it(`forRoutes(TestController) should execute middleware once when request url is equal match`, () => {
    return request(app.getHttpServer())
      .get('/a/test')
      .expect(200)
      .then(() => {
        expect(number).to.be.eq(1);
        expect(applyRoute).to.be.eq('/a/test')
      });
  });

	it(`forRoutes(TestController) should execute middleware once when request url not is equal match`, () => {
		return request(app.getHttpServer())
			.get('/a/1')
			.expect(200)
			.then(() => {
				expect(number).to.be.eq(1);
				expect(applyRoute).to.be.eq('/a/:id')
			});
	});

  afterEach(async () => {
    await app.close();
  });
});
