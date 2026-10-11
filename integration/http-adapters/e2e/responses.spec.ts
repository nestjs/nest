import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { adapters, createApp } from '../src/adapters.js';
import { ResponsesModule } from '../src/responses/responses.module.js';

const binary = (
  res: request.Response,
  callback: (err: any, body: Buffer) => void,
) => {
  const chunks: Buffer[] = [];
  res.on('data', (chunk: Buffer) => chunks.push(chunk));
  res.on('end', () => callback(null, Buffer.concat(chunks)));
};

describe.each(adapters('express', 'node'))(
  'Redirects and res.send() (%s)',
  name => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await createApp(name, ResponsesModule);
    });

    afterAll(async () => {
      await app.close();
    });

    it('should send @Redirect() with an encoded Location, a short note and "Vary: Accept"', async () => {
      const res = await request(app.getHttpServer()).get('/redirect');

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/target?from=a%20b');
      expect(res.headers.vary).toBe('Accept');
      expect(res.text).toBe('Found. Redirecting to /target?from=a%20b');
    });

    it('should send the note as HTML to clients that prefer it', async () => {
      const res = await request(app.getHttpServer())
        .get('/redirect')
        .set('accept', 'text/html');

      expect(res.headers['content-type']).toMatch(/^text\/html/);
      expect(res.text).toBe('<p>Found. Redirecting to /target?from=a%20b</p>');
    });

    it('should take the URL and status a @Redirect() handler returns', async () => {
      const res = await request(app.getHttpServer()).get('/redirect-dynamic');

      expect(res.status).toBe(301);
      expect(res.headers.location).toBe('/dynamic');
    });

    it('should send no body in answer to HEAD', async () => {
      const res = await request(app.getHttpServer()).head('/redirect');

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/target?from=a%20b');
      expect(res.text ?? '').toBe('');
    });

    it.each([
      ['/send-number', '42'],
      ['/send-boolean', 'true'],
    ])('should send %s as JSON through res.send()', async (path, text) => {
      const res = await request(app.getHttpServer()).get(path);

      expect(res.headers['content-type']).toBe(
        'application/json; charset=utf-8',
      );
      expect(res.text).toBe(text);
    });
  },
);

// Express serializes typed arrays to JSON; Node, like Fastify, sends their bytes
describe.each(adapters('fastify', 'node'))('Binary bodies (%s)', name => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp(name, ResponsesModule);
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    ['/typed-array', [1, 2, 3, 4]],
    ['/data-view', [1, 2, 3]],
    ['/buffer', [1, 2, 3]],
  ])(
    'should send %s as application/octet-stream bytes',
    async (path, bytes) => {
      const res = await request(app.getHttpServer())
        .get(path)
        .buffer(true)
        .parse(binary);

      expect(res.headers['content-type']).toBe('application/octet-stream');
      expect([...res.body]).toEqual(bytes);
    },
  );
});
