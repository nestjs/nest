import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';

describe('Valibot Serializer (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET / should return serialized user without password', () => {
    return request(app.getHttpServer()).get('/').expect(200).expect({
      id: 1,
      firstName: 'Kamil',
      lastName: 'Mysliwiec',
      fullName: 'Kamil Mysliwiec',
      role: 'admin',
    });
  });

  it('GET / response should not contain password', async () => {
    const response = await request(app.getHttpServer()).get('/').expect(200);

    expect(response.body).not.toHaveProperty('password');
  });

  it('GET / should transform role to string', async () => {
    const response = await request(app.getHttpServer()).get('/').expect(200);

    expect(typeof response.body.role).toBe('string');
    expect(response.body.role).toBe('admin');
  });

  it('GET / should include computed fullName', async () => {
    const response = await request(app.getHttpServer()).get('/').expect(200);

    expect(response.body.fullName).toBe('Kamil Mysliwiec');
  });
});
