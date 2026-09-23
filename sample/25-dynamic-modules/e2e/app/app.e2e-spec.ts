import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';

describe('Dynamic modules (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('should create users with "usr_" identifiers', async () => {
    const response = await request(app.getHttpServer())
      .post('/users')
      .send({ name: 'Kamil' })
      .expect(201);

    expect(response.body).toEqual({
      id: expect.stringMatching(/^usr_[0-9a-f-]{36}$/),
      name: 'Kamil',
    });
  });

  it('should create orders with "ord_" identifiers', async () => {
    const response = await request(app.getHttpServer())
      .post('/orders')
      .send({ product: 'T-shirt' })
      .expect(201);

    expect(response.body).toEqual({
      id: expect.stringMatching(/^ord_[0-9a-f-]{36}$/),
      product: 'T-shirt',
    });
  });
});
