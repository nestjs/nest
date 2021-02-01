import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import { readFileSync } from 'fs';
import { join } from 'path';
import { AppModule } from '../src/app.module';

const readmeString = readFileSync(join(process.cwd(), 'Readme.md')).toString();

describe('Fastify FileSend', () => {
  let app: NestFastifyApplication;

  beforeEach(async () => {
    const modRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = modRef.createNestApplication(new FastifyAdapter());
    await app.init();
  });

  it('should return a file from a stream', async () => {
    return app.inject({
      method: 'GET',
      url: '/file/stream'
    }).then(({ payload }) => {
      expect(payload.toString()).to.be.eq(readmeString);
    });
  });
  it('should return a file from a buffer', async () => {
    return app.inject({
      method: 'GET',
      url: '/file/buffer',
    }).then(({ payload }) => {
      expect(payload.toString()).to.be.eq(readmeString);
    });
  });
  /**
   * It seems that Fastify has a similar issue as Kamil initially pointed out
   * If a class has a `pipe` method, it will be treated as a stream. This means
   * that the `NonFile` test is a failed case for fastify, hence the skip.
   */
  it.skip('should not stream a non-file', async () => {
    return app.inject({
      url: '/non-file/pipe-method',
      method: 'get'
    }).then(({ payload }) => {
      expect(payload).to.be.eq({ value: 'Hello world' });
    });
  });
  it('should return a file from an RxJS stream', async () => {
    return app.inject({
      method: 'GET',
      url: '/file/rxjs/stream'
    }).then(({ payload }) => {
      expect(payload.toString()).to.be.eq(readmeString);
    });
  });
});
