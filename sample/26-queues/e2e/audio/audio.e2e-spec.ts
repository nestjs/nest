import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { getQueueToken } from '@nestjs/bull';

describe('Audio (e2e)', () => {
  let app: INestApplication;

  // Mock queue that doesn't need Redis
  const mockQueue = {
    add: jest.fn().mockResolvedValue({ id: 1 }),
    process: jest.fn(),
    on: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getQueueToken('audio'))
      .useValue(mockQueue)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /audio/transcode', () => {
    it('should accept transcode request and return 201', async () => {
      const response = await request(app.getHttpServer())
        .post('/audio/transcode')
        .expect(201);

      expect(mockQueue.add).toHaveBeenCalled();
    });

    it('should queue the job successfully', async () => {
      mockQueue.add.mockClear();

      await request(app.getHttpServer())
        .post('/audio/transcode')
        .expect(201);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'transcode',
        expect.objectContaining({ file: expect.any(String) })
      );
    });

    it('should handle multiple concurrent requests', async () => {
      mockQueue.add.mockClear();

      const requests = [
        request(app.getHttpServer()).post('/audio/transcode'),
        request(app.getHttpServer()).post('/audio/transcode'),
        request(app.getHttpServer()).post('/audio/transcode'),
      ];

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      expect(mockQueue.add).toHaveBeenCalledTimes(3);
    });
  });

  describe('GET /audio', () => {
    it('should return 404 for GET request', async () => {
      await request(app.getHttpServer())
        .get('/audio')
        .expect(404);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid routes', async () => {
      await request(app.getHttpServer())
        .post('/audio/invalid')
        .expect(404);
    });

    it('should accept POST to transcode endpoint', async () => {
      const response = await request(app.getHttpServer())
        .post('/audio/transcode');
      
      expect(response.status).toBe(201);
    });
  });
});
