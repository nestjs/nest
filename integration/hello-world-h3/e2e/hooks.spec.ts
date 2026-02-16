import { Controller, Get } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { H3Adapter, NestH3Application } from '@nestjs/platform-h3';
import { expect } from 'chai';
import * as request from 'supertest';

@Controller('test')
class TestController {
  @Get()
  test() {
    return 'success';
  }

  @Get('/slow')
  async slow() {
    await new Promise(resolve => setTimeout(resolve, 50));
    return 'slow-success';
  }
}

describe('Lifecycle Hooks (H3 adapter)', () => {
  let app: NestH3Application;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('setOnRequestHook()', () => {
    it('should call onRequest hook before handling request', async () => {
      const hookCalls: string[] = [];

      const moduleRef = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      app = moduleRef.createNestApplication<NestH3Application>(new H3Adapter());
      const adapter = app.getHttpAdapter().getInstance() as any;

      // Access the adapter directly to set the hook
      (app.getHttpAdapter() as H3Adapter).setOnRequestHook((req, res, done) => {
        hookCalls.push('onRequest:' + req.url);
        done();
      });

      await app.init();

      await request(app.getHttpServer())
        .get('/test')
        .expect(200)
        .expect('success');

      expect(hookCalls).to.include('onRequest:/test');
    });

    it('should support async onRequest hooks', async () => {
      const hookCalls: string[] = [];

      const moduleRef = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      app = moduleRef.createNestApplication<NestH3Application>(new H3Adapter());

      (app.getHttpAdapter() as H3Adapter).setOnRequestHook(
        async (req, res, done) => {
          await new Promise(resolve => setTimeout(resolve, 10));
          hookCalls.push('async-onRequest:' + req.url);
          done();
        },
      );

      await app.init();

      await request(app.getHttpServer())
        .get('/test')
        .expect(200)
        .expect('success');

      expect(hookCalls).to.include('async-onRequest:/test');
    });

    it('should call onRequest hook before controller code runs', async () => {
      const executionOrder: string[] = [];

      // Create a controller that tracks execution
      @Controller('order')
      class OrderController {
        @Get()
        test() {
          executionOrder.push('controller');
          return 'done';
        }
      }

      const moduleRef = await Test.createTestingModule({
        controllers: [OrderController],
      }).compile();

      app = moduleRef.createNestApplication<NestH3Application>(new H3Adapter());

      (app.getHttpAdapter() as H3Adapter).setOnRequestHook((req, res, done) => {
        executionOrder.push('hook');
        done();
      });

      await app.init();

      await request(app.getHttpServer()).get('/order').expect(200);

      expect(executionOrder[0]).to.equal('hook');
      expect(executionOrder[1]).to.equal('controller');
    });
  });

  describe('setOnResponseHook()', () => {
    it('should call onResponse hook after response is finished', async () => {
      const hookCalls: string[] = [];

      const moduleRef = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      app = moduleRef.createNestApplication<NestH3Application>(new H3Adapter());

      (app.getHttpAdapter() as H3Adapter).setOnResponseHook((req, res) => {
        hookCalls.push('onResponse:' + req.url + ':' + res.statusCode);
      });

      await app.init();

      await request(app.getHttpServer())
        .get('/test')
        .expect(200)
        .expect('success');

      // Give a small delay for the finish event to fire
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(hookCalls).to.include('onResponse:/test:200');
    });

    it('should call onResponse hook with correct status code for errors', async () => {
      const hookCalls: string[] = [];

      const moduleRef = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      app = moduleRef.createNestApplication<NestH3Application>(new H3Adapter());

      (app.getHttpAdapter() as H3Adapter).setOnResponseHook((req, res) => {
        hookCalls.push('onResponse:' + req.url + ':' + res.statusCode);
      });

      await app.init();

      await request(app.getHttpServer()).get('/nonexistent').expect(404);

      // Give a small delay for the finish event to fire
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(hookCalls.some(call => call.includes(':404'))).to.be.true;
    });
  });

  describe('combined hooks', () => {
    it('should support both onRequest and onResponse hooks together', async () => {
      const hookCalls: string[] = [];

      const moduleRef = await Test.createTestingModule({
        controllers: [TestController],
      }).compile();

      app = moduleRef.createNestApplication<NestH3Application>(new H3Adapter());

      (app.getHttpAdapter() as H3Adapter).setOnRequestHook((req, res, done) => {
        hookCalls.push('request:start');
        done();
      });

      (app.getHttpAdapter() as H3Adapter).setOnResponseHook((req, res) => {
        hookCalls.push('response:end');
      });

      await app.init();

      await request(app.getHttpServer()).get('/test').expect(200);

      // Give a small delay for the finish event to fire
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(hookCalls).to.include('request:start');
      expect(hookCalls).to.include('response:end');
      expect(hookCalls.indexOf('request:start')).to.be.lessThan(
        hookCalls.indexOf('response:end'),
      );
    });
  });
});
