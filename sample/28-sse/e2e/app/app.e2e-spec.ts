import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as http from 'http';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('SSE (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication({ forceCloseConnections: true });
    await app.listen(0);
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET / should return HTML content', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Content-Type', /html/);
  });

  it('GET /sse should return event stream with SSE events', (done) => {
    const server = app.getHttpServer();
    const address = server.address();
    const port = typeof address === 'string' ? 3000 : address?.port;

    http.get(`http://127.0.0.1:${port}/sse`, (res) => {
      expect(res.headers['content-type']).toContain('text/event-stream');

      let received = '';
      res.on('data', (chunk) => {
        received += chunk.toString();
        if (received.includes('"hello":"world"')) {
          res.destroy();
          done();
        }
      });
    });
  }, 10000);
});
