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
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('GET /', () => {
    it('should return the hello message from config', async () => {
      const response = await request(app.getHttpServer()).get('/').expect(200);

      expect(response.text).toBe('Hello there, world!');
    });

    it('should return a string', async () => {
      const response = await request(app.getHttpServer()).get('/').expect(200);

      expect(typeof response.text).toBe('string');
      expect(response.text.length).toBeGreaterThan(0);
    });
  });
});
