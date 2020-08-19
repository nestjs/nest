import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import * as request from 'supertest';
import { RequestMethod } from '@nestjs/common/enums/request-method.enum'
describe('Global prefix', () => {
    let server;
    let app: INestApplication;
  
    beforeEach(async () => {
      const module = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();
  
      app = module.createNestApplication();
    });

    it.only(`should use the global prefix`, async () => {
      app.setGlobalPrefix('/api/v1')

      server = app.getHttpServer();
      await app.init();

      await request(server)
        .get('/health')
        .expect(404)

      await request(server)
        .get('/api/v1/health')
        .expect(200)
    });

    it.only(`should exclude the path as string`, async () => {
      app.setGlobalPrefix('/api/v1', {exclude: ['/test']})

      server = app.getHttpServer();
      await app.init();

      await request(server)
        .get('/test')
        .expect(200)
      await request(server)
        .post('/test')
        .expect(201)

      await request(server)
        .get('/api/v1/test')
        .expect(404)
      await request(server)
        .post('/api/v1/test')
        .expect(404)
    });

    it.only(`should exclude the path as RouteInfo`, async () => {
      app.setGlobalPrefix('/api/v1', {exclude: [{path: '/health', method: RequestMethod.GET}]})

      server = app.getHttpServer();
      await app.init();

      await request(server)
        .get('/health')
        .expect(200)

      await request(server)
        .get('/api/v1/health')
        .expect(404)
    });

    it.only(`should exclude the path as a mix of string and RouteInfo`, async () => {
      app.setGlobalPrefix('/api/v1', {exclude: ["test", {path: '/health', method: RequestMethod.GET}]})

      server = app.getHttpServer();
      await app.init();

      await request(server)
        .get('/health')
        .expect(200)

      await request(server)
        .get('/test')
        .expect(200)
    });

    it.only(`should exclude the path with route param`, async () => {
      app.setGlobalPrefix('/api/v1', {exclude: ['/hello/:name']})

      server = app.getHttpServer();
      await app.init();

      await request(server)
        .get('/hello/foo')
        .expect(200)
    });
  
    afterEach(async () => {
      await app.close();
    });
});
