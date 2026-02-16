import { H3Adapter, NestH3Application } from '@nestjs/platform-h3';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Hello world (H3 adapter)', () => {
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

  describe('Basic GET routes', () => {
    it('/GET should return "Hello world!"', () => {
      return request(server).get('/hello').expect(200).expect('Hello world!');
    });

    it('/GET should attach response header', () => {
      return request(server)
        .get('/hello')
        .expect(200)
        .expect('Authorization', 'Bearer');
    });

    it('/GET (Promise/async) returns "Hello world!"', () => {
      return request(server)
        .get('/hello/async')
        .expect(200)
        .expect('Hello world!');
    });

    it('/GET (Observable stream) returns "Hello world!"', () => {
      return request(server)
        .get('/hello/stream')
        .expect(200)
        .expect('Hello world!');
    });
  });

  describe('@Param() decorator', () => {
    it('should extract route parameter', () => {
      return request(server)
        .get('/hello/param/123')
        .expect(200)
        .expect({ id: '123' });
    });

    it('should handle different parameter values', () => {
      return request(server)
        .get('/hello/param/abc-def')
        .expect(200)
        .expect({ id: 'abc-def' });
    });
  });

  describe('@Query() decorator', () => {
    it('should extract single query parameter', () => {
      return request(server)
        .get('/hello/query?name=John')
        .expect(200)
        .expect({ name: 'John' });
    });

    it('should extract full query object', () => {
      return request(server)
        .get('/hello/full-query?name=John&age=30&active=true')
        .expect(200)
        .expect({ name: 'John', age: '30', active: 'true' });
    });
  });

  describe('@Body() decorator', () => {
    it('should parse JSON body in POST request', () => {
      const body = { name: 'John', email: 'john@example.com' };
      return request(server)
        .post('/hello/body')
        .send(body)
        .expect(201)
        .expect(body);
    });

    it('should parse JSON body in PUT request with params', () => {
      const body = { name: 'Jane', email: 'jane@example.com' };
      return request(server)
        .put('/hello/body/456')
        .send(body)
        .expect(200)
        .expect({ id: '456', body });
    });
  });

  describe('@Req() and @Res() decorators', () => {
    it('should provide access to request object via @Req()', () => {
      return request(server)
        .get('/hello/req')
        .expect(200)
        .expect(res => {
          expect(res.body.method).to.equal('GET');
          expect(res.body.url).to.contain('/hello/req');
        });
    });

    it('should allow response control via @Res()', () => {
      return request(server)
        .get('/hello/res')
        .expect(200)
        .expect('Response from @Res()');
    });

    it('should support @Res({ passthrough: true })', () => {
      return request(server)
        .get('/hello/res-passthrough')
        .expect(200)
        .expect('X-Custom-Header', 'custom-value')
        .expect({ passthrough: true });
    });

    it('should expose H3Event on request', () => {
      return request(server)
        .get('/hello/h3-event')
        .expect(200)
        .expect({ hasH3Event: true });
    });
  });

  describe('Local pipes', () => {
    it('should execute locally injected pipe', () => {
      return request(server)
        .get('/hello/local-pipe/1')
        .expect(200)
        .expect({ id: '1' });
    });
  });

  describe('404 handling', () => {
    it('should return 404 for unknown routes', () => {
      return request(server).get('/unknown-route').expect(404);
    });
  });
});
