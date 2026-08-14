import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AddressInfo } from 'net';
import http from 'http';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

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
    it('should return 200 with HTML content', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect('content-type', /text\/html/)
        .expect((res) => {
          expect(res.text).toContain('EventSource');
        });
    });
  });

  describe('GET /sse', () => {
    it('should return text/event-stream and emit event data', () => {
      return new Promise<void>((resolve, reject) => {
        const httpServer = app.getHttpServer();
        if (!httpServer.listening) httpServer.listen(0);
        const { port } = httpServer.address() as AddressInfo;

        let received = '';
        let completed = false;

        const finish = (err?: Error) => {
          if (!completed) {
            completed = true;
            if (err) reject(err);
            else resolve();
          }
        };

        const req = http.get(`http://127.0.0.1:${port}/sse`, (res) => {
          expect(res.statusCode).toBe(200);
          expect(res.headers['content-type']).toContain('text/event-stream');

          res.on('data', (chunk: Buffer) => {
            received += chunk.toString();
            if (received.includes('"hello":"world"')) {
              expect(received).toContain('"hello":"world"');
              req.destroy();
              finish();
            }
          });
        });

        req.on('error', (err: NodeJS.ErrnoException) => {
          if (err.code !== 'ECONNRESET') finish(err);
        });
      });
    }, 5000);
  });
});
