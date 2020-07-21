import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import { expect } from 'chai';
import { AppModule } from '../src/app.module';
import { randomPort } from './utils';
import * as request from 'supertest';

describe('Fastify Application', () => {
  let testModule: TestingModule;
  let port: number;
  let app: NestFastifyApplication;

  beforeEach(async () => {
    testModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
  });

  beforeEach(async () => {
    port = await randomPort();
  });

  afterEach(async () => {
    app && (await app.close());
  });

  it('should include X-Powered-By: NestJS header', async () => {
    app = testModule.createNestApplication(new FastifyAdapter());
    await app.listen(port);
    return request(app.getHttpServer()).get('/').expect('X-Powered-By', 'NestJS');
  });

  describe('getUrl', () => {
    it('should be able to get the IPv4 address', async () => {
      app = testModule.createNestApplication(new FastifyAdapter());
      await app.listen(port, '127.0.0.5');
      expect(await app.getUrl()).to.be.eql(`http://127.0.0.5:${port}`);
    });
    it('should return 127.0.0.1 for 0.0.0.0', async () => {
      app = testModule.createNestApplication(new FastifyAdapter());
      await app.listen(port, '0.0.0.0');
      expect(await app.getUrl()).to.be.eql(`http://127.0.0.1:${port}`);
    });
    it('should throw an error for calling getUrl before listen', async () => {
      const app = testModule.createNestApplication(new FastifyAdapter());
      try {
        await app.getUrl();
      } catch (err) {
        expect(err).to.be.eql(
          'app.listen() needs to be called before calling app.getUrl()',
        );
      }
    });
  });
});
