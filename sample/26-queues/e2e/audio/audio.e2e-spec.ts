import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Audio (e2e)', () => {
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

  describe('POST /audio/transcode', () => {
    it('should accept transcode request and return 201', async () => {
      await request(app.getHttpServer())
        .post('/audio/transcode')
        .expect(201);
    });

    it('should return correct status code for valid request', async () => {
      const response = await request(app.getHttpServer())
        .post('/audio/transcode');

      expect(response.status).toBe(201);
    });

    it('should handle multiple concurrent requests', async () => {
      const requests = [
        request(app.getHttpServer()).post('/audio/transcode'),
        request(app.getHttpServer()).post('/audio/transcode'),
        request(app.getHttpServer()).post('/audio/transcode'),
      ];

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(201);
      });
    });

    it('should accept POST method only', async () => {
      await request(app.getHttpServer())
        .get('/audio/transcode')
        .expect(404);
    });

    it('should reject GET requests', async () => {
      await request(app.getHttpServer())
        .get('/audio/transcode')
        .expect(404);
    });

    it('should reject PUT requests', async () => {
      await request(app.getHttpServer())
        .put('/audio/transcode')
        .expect(404);
    });

    it('should reject DELETE requests', async () => {
      await request(app.getHttpServer())
        .delete('/audio/transcode')
        .expect(404);
    });

    it('should return 404 for invalid endpoints', async () => {
      await request(app.getHttpServer())
        .post('/audio/invalid')
        .expect(404);
    });

    it('should handle requests without errors', async () => {
      const response = await request(app.getHttpServer())
        .post('/audio/transcode');

      expect(response.error).toBeFalsy();
    });
  });
});
