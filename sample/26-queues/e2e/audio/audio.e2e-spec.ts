import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
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
  }, 30000); // 30 second timeout for setup

  afterAll(async () => {
    await app.close();
  }, 30000); // 30 second timeout for teardown

  describe('POST /audio/transcode', () => {
    it('should accept transcode request and return 201', async () => {
      await request(app.getHttpServer())
        .post('/audio/transcode')
        .expect(201);
    }, 10000); // 10 second timeout

    it('should return correct status code for valid request', async () => {
      const response = await request(app.getHttpServer())
        .post('/audio/transcode');
      
      expect(response.status).toBe(201);
    }, 10000);

    it('should handle multiple concurrent requests', async () => {
      const requests = [
        request(app.getHttpServer()).post('/audio/transcode'),
        request(app.getHttpServer()).post('/audio/transcode'),
        request(app.getHttpServer()).post('/audio/transcode'),
      ];

      const responses = await Promise.all(requests);
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });
    }, 15000); // 15 seconds for concurrent

    it('should handle requests without errors', async () => {
      const response = await request(app.getHttpServer())
        .post('/audio/transcode');
      
      expect(response.error).toBeFalsy();
    }, 10000);
  });

  describe('GET /audio', () => {
    it('should return method not allowed for GET', async () => {
      await request(app.getHttpServer())
        .get('/audio')
        .expect(404);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing route gracefully', async () => {
      await request(app.getHttpServer())
        .post('/audio/invalid')
        .expect(404);
    });

    it('should accept POST requests to valid endpoint', async () => {
      const response = await request(app.getHttpServer())
        .post('/audio/transcode');
      
      expect([200, 201]).toContain(response.status);
    }, 10000);
  });
});
