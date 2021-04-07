import { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import { expect } from 'chai';
import * as request from 'supertest';

import { AppModule } from '../src/app.module';

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
    await app.init();
    const response = await request(app.getHttpServer()).get('/').expect(200);
    expect(response.body.title).to.equal('My Website');
  });

  it('should get "email" from "app.locals"', async () => {
    app.setLocal('email', 'admin@example.com');
    await app.listen(4444);
    const response = await request(app.getHttpServer()).get('/').expect(200);
    expect(response.body.email).to.equal('admin@example.com');
  });

  afterEach(async () => {
    await app.close();
  });
});
