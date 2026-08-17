import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /', () => {
    it('should return a serialized user with expected fields', async () => {
      const response = await request(app.getHttpServer()).get('/').expect(200);

      expect(response.body).toMatchObject({
        id: 1,
        firstName: 'Kamil',
        lastName: 'Mysliwiec',
      });
    });

    it('should exclude the password field', async () => {
      const response = await request(app.getHttpServer()).get('/').expect(200);

      expect(response.body).not.toHaveProperty('password');
    });

    it('should expose the computed fullName field', async () => {
      const response = await request(app.getHttpServer()).get('/').expect(200);

      expect(response.body.fullName).toBe('Kamil Mysliwiec');
    });

    it('should transform the role to its name string', async () => {
      const response = await request(app.getHttpServer()).get('/').expect(200);

      expect(response.body.role).toBe('admin');
    });
  });
});
