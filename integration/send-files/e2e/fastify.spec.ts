import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { readFileSync } from 'fs';
import { get } from 'http';
import { join } from 'path';
import { listenOnLoopback } from '../../_support/listen-on-loopback.js';
import { AppModule } from '../src/app.module.js';
import { AppService } from '../src/app.service.js';
import { getHttpBaseOptions } from './utils.js';

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
      .then(({ statusCode, payload }) => {
        expect(statusCode).toBe(400);
        expect(payload).toBe('Bad Request');
      });
  });
  it('should answer with the error handler set on the file', async () => {
    return app
      .inject({ method: 'GET', url: '/file/not/exist/error-handler' })
      .then(({ statusCode, payload }) => {
        expect(statusCode).toBe(503);
        expect(payload).toBe('custom');
      });
  });
  it('should log with the error logger set on the file', async () => {
    const { statusCode } = await app.inject({
      method: 'GET',
      url: '/file/not/exist/error-logger',
    });
    expect(statusCode).toBe(400);
    expect(app.get(AppService).loggedErrors).toEqual([
      expect.objectContaining({ code: 'ENOENT' }),
    ]);
  });
  it('should not complete the response when the stream fails after sending data', async () => {
    const url = await getHttpBaseOptions(await listenOnLoopback(app));
    const complete = await new Promise<boolean>(resolve => {
      get(new URL('/file/fails/midway', url), res => {
        res.resume();
        res.on('close', () => resolve(res.complete));
      }).on('error', () => resolve(false));
    });
    expect(complete).toBe(false);
  });
  it('should log with the error logger set on a file that fails midway', async () => {
    const url = await getHttpBaseOptions(await listenOnLoopback(app));
    await new Promise<void>(resolve => {
      get(new URL('/file/fails/midway/error-logger', url), res => {
        res.resume();
        res.on('close', () => resolve());
      }).on('error', () => resolve());
    });
    await vi.waitFor(() =>
      expect(app.get(AppService).loggedErrors).toEqual([
        expect.objectContaining({ message: 'EIO: i/o error, read' }),
      ]),
    );
  });
  it('should answer a HEAD request with the headers of a file', async () => {
    return app
      .inject({ url: '/file/with/headers', method: 'HEAD' })
      .then(({ statusCode, headers, payload }) => {
        expect(statusCode).toBe(200);
        expect(headers['content-type']).toBe('text/markdown');
        expect(headers['content-disposition']).toBe(
          'attachment; filename="Readme.md"',
        );
        expect(headers['content-length']).toBe(`${readme.byteLength}`);
        expect(payload).toBe('');
      });
  });
  /**
   * A HEAD request does not read the file, so its answer does not depend on
   * whether the file can be opened (unlike the 400 of a GET request).
   */
  it('should answer a HEAD request without reading a file that does not exist', async () => {
    return app
      .inject({
        method: 'HEAD',
        url: '/file/not/exist',
      })
      .then(({ statusCode }) => {
        expect(statusCode).toBe(200);
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
