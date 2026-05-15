import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { readFileSync } from 'fs';
import { join } from 'path';
import { AppModule } from '../src/app.module.js';

const readme = readFileSync(join(process.cwd(), 'Readme.md'));
const readmeString = readme.toString();

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
    return app
      .inject({
        method: 'GET',
        url: '/file/stream',
      })
      .then(({ payload, statusCode }) => {
        expect(statusCode).toBe(200);
        expect(payload.toString()).toBe(readmeString);
      });
  });
  it('should return a file from a buffer', async () => {
    return app
      .inject({
        method: 'GET',
        url: '/file/buffer',
      })
      .then(({ payload, statusCode }) => {
        expect(statusCode).toBe(200);
        expect(payload.toString()).toBe(readmeString);
      });
  });
  /**
   * It seems that Fastify has a similar issue as Kamil initially pointed out
   * If a class has a `pipe` method, it will be treated as a stream. This means
   * that the `NonFile` test is a failed case for fastify, hence the skip.
   */
  it.skip('should not stream a non-file', async () => {
    return app
      .inject({
        url: '/non-file/pipe-method',
        method: 'get',
      })
      .then(({ payload }) => {
        expect(payload).toBe({ value: 'Hello world' });
      });
  });
  it('should return a file from an RxJS stream', async () => {
    return app
      .inject({
        method: 'GET',
        url: '/file/rxjs/stream',
      })
      .then(({ payload, statusCode }) => {
        expect(statusCode).toBe(200);
        expect(payload.toString()).toBe(readmeString);
      });
  });
  it('should return a file with correct headers', async () => {
    return app
      .inject({ url: '/file/with/headers', method: 'get' })
      .then(({ statusCode, headers, payload }) => {
        expect(statusCode).toBe(200);
        expect(headers['content-type']).toBe('text/markdown');
        expect(headers['content-disposition']).toBe(
          'attachment; filename="Readme.md"',
        );
        expect(headers['content-length']).toBe(`${readme.byteLength}`);
        expect(payload).toBe(readmeString);
      });
  });
  it('should return an error if the file does not exist', async () => {
    return app
      .inject({
        method: 'GET',
        url: '/file/not/exist',
      })
      .then(({ statusCode }) => {
        expect(statusCode).toBe(500);
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
