import { H3Adapter, NestH3Application } from '@nestjs/platform-h3';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('HTTP Methods (H3 adapter)', () => {
  let server: App;
  let app: NestH3Application;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication<NestH3Application>(new H3Adapter());
    server = app.getHttpServer();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET method', () => {
    it('should handle GET requests', () => {
      return request(server).get('/hello').expect(200).expect('Hello world!');
    });
  });

  describe('POST method', () => {
    it('should handle POST requests', () => {
      const body = { name: 'Test', email: 'test@example.com' };
      return request(server)
        .post('/hello/body')
        .send(body)
        .expect(201)
        .expect(body);
    });
  });

  describe('PUT method', () => {
    it('should handle PUT requests', () => {
      const body = { name: 'Updated', email: 'updated@example.com' };
      return request(server)
        .put('/hello/body/123')
        .send(body)
        .expect(200)
        .expect({ id: '123', body });
    });
  });

  describe('DELETE method', () => {
    it('should handle DELETE requests', () => {
      return request(server)
        .delete('/hello/resource/456')
        .expect(200)
        .expect({ deleted: '456' });
    });
  });

  describe('PATCH method', () => {
    it('should handle PATCH requests', () => {
      const patchBody = { name: 'Patched' };
      return request(server)
        .patch('/hello/resource/789')
        .send(patchBody)
        .expect(200)
        .expect({ id: '789', patched: patchBody });
    });
  });

  describe('HEAD method', () => {
    it('should handle HEAD requests', () => {
      return request(server)
        .head('/hello/resource')
        .expect(200)
        .expect(res => {
          // HEAD should return no body
          if (res.text && res.text.length > 0) {
            throw new Error('HEAD response should have no body');
          }
        });
    });
  });

  describe('OPTIONS method', () => {
    it('should handle OPTIONS requests', () => {
      return request(server)
        .options('/hello/resource')
        .expect(200)
        .expect({
          methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
        });
    });
  });
});
