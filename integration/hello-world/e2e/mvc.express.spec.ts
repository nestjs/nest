import { join } from 'path';
import { INestApplication } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import * as express from 'express';
import * as request from 'supertest';
import * as nunjucks from 'nunjucks';
import { ApplicationModule } from '../src/app.module';

interface IExpressNestApplication extends INestApplication {
  setBaseViewsDir(string): IExpressNestApplication
  setViewEngine(string): IExpressNestApplication
}

describe('Hello world MVC', () => {
  let server;
  let app: IExpressNestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [ApplicationModule],
    }).compile();

    const expressApp = express();
    nunjucks.configure(join(__dirname, '..', 'src', 'views'), {
      autoescape: true,
      express: expressApp
    });

    app = module.createNestApplication<IExpressNestApplication>(new ExpressAdapter(expressApp));
    app.setViewEngine('njk')
    server = app.getHttpServer();
    await app.init();
  });

  it(`/GET`, () => {
    return request(server)
      .get('/hello/mvc')
      .expect(200)
      .expect(/href="\/hello\/mvc/)
  });

  it(`/GET/:id`, () => {
    const id = 5;
    return request(server)
      .get(`/hello/mvc/${id}`)
      .expect(200)
      .expect(new RegExp(`href="/hello/mvc/${id}`))
  });

  afterEach(async () => {
    await app.close();
  });
});
