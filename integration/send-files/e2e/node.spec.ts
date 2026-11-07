import { NestNodeApplication, NodeAdapter } from '@nestjs/platform-node';
import { Test } from '@nestjs/testing';
import { readFileSync } from 'fs';
import { get } from 'http';
import { join } from 'path';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { AppService } from '../src/app.service.js';
import {
  getHttpBaseOptions,
  sendCanceledHttpRequest,
  sendHttpRequest,
} from './utils.js';
import { listenOnLoopback } from '../../_support/listen-on-loopback.js';

const readme = readFileSync(join(process.cwd(), 'Readme.md'));
const readmeString = readme.toString();

describe('Node FileSend', () => {
  let app: NestNodeApplication;

  beforeEach(async () => {
    const modRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = modRef.createNestApplication(new NodeAdapter());
    await listenOnLoopback(app);
  });

  it('should return a file from a stream', async () => {
    return request(app.getHttpServer())
      .get('/file/stream/')
      .expect(200)
      .expect(res => {
        expect(res.body.toString()).toBe(readmeString);
      });
  });
  it('should return a file from a buffer', async () => {
    return request(app.getHttpServer())
      .get('/file/buffer')
      .expect(200)
      .expect(res => {
        expect(res.body.toString()).toBe(readmeString);
      });
  });
  it('should not stream a non-file', async () => {
    return request(app.getHttpServer())
      .get('/non-file/pipe-method')
      .expect(200)
      .expect({ value: 'Hello world' });
  });
  it('should return a file from an RxJS stream', async () => {
    return request(app.getHttpServer())
      .get('/file/rxjs/stream/')
      .expect(200)
      .expect(res => {
        expect(res.body.toString()).toBe(readmeString);
      });
  });
  it('should return a file with correct headers', async () => {
    return request(app.getHttpServer())
      .get('/file/with/headers')
      .expect(200)
      .expect('Content-Type', 'text/markdown')
      .expect('Content-Disposition', 'attachment; filename="Readme.md"')
      .expect('Content-Length', readme.byteLength.toString())
      .expect(res => {
        expect(res.text).toBe(readmeString);
      });
  });
  it('should answer a HEAD request with the headers of a file', async () => {
    return request(app.getHttpServer())
      .head('/file/with/headers')
      .expect(200)
      .expect('Content-Type', 'text/markdown')
      .expect('Content-Disposition', 'attachment; filename="Readme.md"')
      .expect('Content-Length', readme.byteLength.toString());
  });
  it('should answer a HEAD request with an error if the file does not exist', async () => {
    return request(app.getHttpServer()).head('/file/not/exist').expect(400);
  });
  it('should return an error if the file does not exist', async () => {
    return request(app.getHttpServer()).get('/file/not/exist').expect(400);
  });
  it('should not complete the response when the stream fails after sending data', async () => {
    const url = await getHttpBaseOptions(app);
    const complete = await new Promise<boolean>(resolve => {
      get(new URL('/file/fails/midway', url), res => {
        res.resume();
        res.on('close', () => resolve(res.complete));
      }).on('error', () => resolve(false));
    });
    expect(complete).toBe(false);
  });
  it('should answer with the error handler set on the file', async () => {
    const res = await request(app.getHttpServer()).get(
      '/file/not/exist/error-handler',
    );
    expect(res.status).toBe(503);
    // Express keeps the type of the file, so the body is not parsed as text
    expect(String(res.text ?? res.body)).toBe('custom');
  });
  it('should log with the error logger set on the file', async () => {
    await request(app.getHttpServer())
      .get('/file/not/exist/error-logger')
      .expect(400);
    expect(app.get(AppService).loggedErrors).toEqual([
      expect.objectContaining({ code: 'ENOENT' }),
    ]);
  });
  it('should log with the error logger set on a file that fails midway', async () => {
    const url = await getHttpBaseOptions(app);
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
  // TODO: temporarily turned off (flaky test)
  it.skip('should allow for the client to end the response and be able to make another', async () => {
    const url = await getHttpBaseOptions(app);
    await sendCanceledHttpRequest(new URL('/file/slow', url));
    const res = await sendHttpRequest(new URL('/file/stream', url));
    expect(res.statusCode).toBe(200);
  });
});
