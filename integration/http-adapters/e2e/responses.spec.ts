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

describe.each(adapters('express', 'node'))('res.sendFile() (%s)', name => {
  let app: INestApplication;
  const get = (path: string) => request(app.getHttpServer()).get(path);

  beforeAll(async () => {
    app = await createApp(name, ResponsesModule);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should stream the file with its type, length, Last-Modified and ETag', async () => {
    const res = await get('/files/hello.txt');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('text/plain; charset=utf-8');
    expect(res.headers['content-length']).toBe('17');
    expect(res.headers['accept-ranges']).toBe('bytes');
    expect(res.headers['last-modified']).toBeDefined();
    expect(res.headers.etag).toBeDefined();
    expect(res.text).toBe('hello from a file');
  });

  it('should resolve a relative path against the root option', async () => {
    expect((await get('/rooted/hello.txt')).text).toBe('hello from a file');
  });

  it('should answer ranges and conditional requests', async () => {
    const range = await get('/files/hello.txt').set('range', 'bytes=0-4');
    const { etag } = (await get('/files/hello.txt')).headers;
    const fresh = await get('/files/hello.txt').set('if-none-match', etag);

    expect(range.status).toBe(206);
    expect(range.text).toBe('hello');
    expect(fresh.status).toBe(304);
  });

  it('should hand a missing file to Nest as a 404 without a callback', async () => {
    const res = await get('/files/missing.txt');

    expect(res.status).toBe(404);
    expect(res.body.statusCode).toBe(404);
  });

  it('should answer a directory like an unmatched route', async () => {
    const res = await get('/files/folder');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      message: 'Cannot GET /files/folder',
      error: 'Not Found',
      statusCode: 404,
    });
  });

  it('should leave the response to the callback when given one', async () => {
    const res = await get('/files-or-gone/missing.txt');

    expect(res.status).toBe(410);
    expect(res.text).toBe('gone');
  });
});

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
