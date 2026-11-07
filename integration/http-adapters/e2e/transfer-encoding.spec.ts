import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { adapters, createApp } from '../src/adapters.js';
import { TransferEncodingModule } from '../src/transfer-encoding/transfer-encoding.module.js';

// A message with a "Transfer-Encoding" must not carry a "Content-Length"
// (RFC 9112), and Express leaves it out since 5.3.0
describe.each(adapters('express', 'node'))(
  'Replies with a Transfer-Encoding set with @Header() (%s)',
  name => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await createApp(name, TransferEncodingModule);
    });

    afterAll(async () => {
      await app.close();
    });

    it('should leave out the Content-Length for an object', async () => {
      const res = await request(app.getHttpServer()).get('/chunked/object');

      expect(res.status).toBe(200);
      expect(res.headers['transfer-encoding']).toBe('chunked');
      expect(res.headers['content-length']).toBeUndefined();
      expect(res.body).toEqual({ hello: 'world' });
    });

    it('should leave out the Content-Length for a string', async () => {
      const res = await request(app.getHttpServer()).get('/chunked/text');

      expect(res.status).toBe(200);
      expect(res.headers['transfer-encoding']).toBe('chunked');
      expect(res.headers['content-length']).toBeUndefined();
      expect(res.text).toBe('plain');
    });
  },
);

// The node adapter writes the headers of a StreamableFile itself (see
// NodeAdapter#applyStreamHeaders), so it is the one that must leave out the
// Content-Length a Transfer-Encoding forbids (RFC 9112).
describe('A stream reply with a Transfer-Encoding (node)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp('node', TransferEncodingModule);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should leave out the Content-Length of a stream that has one', async () => {
    const res = await request(app.getHttpServer()).get('/chunked/stream');

    expect(res.status).toBe(200);
    expect(res.headers['transfer-encoding']).toBe('chunked');
    expect(res.headers['content-length']).toBeUndefined();
    expect(res.text).toBe('hello world');
  });
});
