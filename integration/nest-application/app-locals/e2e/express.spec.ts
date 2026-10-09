import { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { listenOnLoopback } from '../../../_support/listen-on-loopback.js';

describe('App-level globals (Express Application)', () => {
  let moduleFixture: TestingModule;
  let app: NestExpressApplication;

  beforeEach(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
  });

  beforeEach(() => {
    app = moduleFixture.createNestApplication<NestExpressApplication>();
  });

  it('should get "title" from "app.locals"', async () => {
    app.setLocal('title', 'My Website');
    await listenOnLoopback(app);
    const response = await request(app.getHttpServer()).get('/').expect(200);
    expect(response.body.title).toBe('My Website');
  });

  it('should get "email" from "app.locals"', async () => {
    app.setLocal('email', 'admin@example.com');
    await listenOnLoopback(app);
    const response = await request(app.getHttpServer()).get('/').expect(200);
    expect(response.body.email).toBe('admin@example.com');
  });

  afterEach(async () => {
    await app.close();
  });
});
