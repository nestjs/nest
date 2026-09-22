import type { INestApplication } from '@nestjs/common';
import { createHash } from 'crypto';
import { once } from 'events';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'fs';
import type { AddressInfo } from 'net';
import { connect } from 'net';
import { tmpdir } from 'os';
import { join } from 'path';
import request from 'supertest';
import { uploadApis } from '../src/upload-api.js';
import { createUploadModule, engineDir } from '../src/upload.module.js';
import { type AdapterName, createApp, PNG, txt } from './utils.js';

type Send = (http: ReturnType<typeof request>) => request.Test;

const adapterNames = ['express', 'fastify'] as const;

/**
 * Every scenario sends the same request to an Express application (the
 * multer interceptors from @nestjs/platform-express) and to a Fastify
 * application (the interceptors from @nestjs/platform-fastify/multipart),
 * both built from one controller, and asserts that the responses are
 * identical.
 */
describe('File upload: Express (multer) and Fastify parity', () => {
  const apps = {} as Record<AdapterName, INestApplication>;
  const dirs = {} as Record<AdapterName, string>;

  async function boot(adapterName: AdapterName, moduleOptions?: object) {
    const dir = mkdtempSync(join(tmpdir(), `nest-upload-${adapterName}-`));
    const app = await createApp(
      adapterName,
      createUploadModule(uploadApis[adapterName], dir, moduleOptions),
    );
    return { app, dir };
  }

  beforeAll(async () => {
    for (const adapterName of adapterNames) {
      ({ app: apps[adapterName], dir: dirs[adapterName] } =
        await boot(adapterName));
    }
  });

  const removeDirs = (dir: string) => {
    for (const path of [dir, engineDir(dir)]) {
      rmSync(path, { recursive: true, force: true });
    }
  };

  afterAll(async () => {
    for (const adapterName of adapterNames) {
      await apps[adapterName]?.close();
      removeDirs(dirs[adapterName]);
    }
  });

  async function expectParity(send: Send, on = apps) {
    const results = {} as Record<AdapterName, { status: number; body: any }>;
    for (const adapterName of adapterNames) {
      const res = await send(request(on[adapterName].getHttpServer()));
      results[adapterName] = { status: res.status, body: res.body };
    }
    expect(results.fastify).toEqual(results.express);
    return results.express;
  }

  const text = (value: string) => Buffer.from(value);

  describe('memory storage', () => {
    it('should populate req.file and req.body in the multer shape', async () => {
      const res = await expectParity(http =>
        http
          .post('/single')
          .field('name', 'Ada')
          .attach('avatar', text('hello'), txt('a.txt')),
      );
      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        file: {
          keys: [
            'fieldname',
            'originalname',
            'encoding',
            'mimetype',
            'buffer',
            'size',
          ],
          fieldname: 'avatar',
          originalname: 'a.txt',
          encoding: '7bit',
          mimetype: 'text/plain',
          size: 5,
          content: 'hello',
        },
        body: { name: 'Ada' },
        files: 'undefined',
      });
    });

    it('should leave the property of the other file strategy undefined', async () => {
      const single = await expectParity(http =>
        http.post('/single').attach('avatar', text('x'), txt('a.txt')),
      );
      expect(single.body.files).toBe('undefined');
      const many = await expectParity(http =>
        http.post('/many').attach('docs', text('x'), txt('a.txt')),
      );
      expect(many.body.file).toBe('undefined');
    });

    it('should parse text fields with bracket notation', async () => {
      const res = await expectParity(http =>
        http
          .post('/single')
          .field('user[name]', 'Ada')
          .field('user[roles][]', 'admin')
          .field('user[roles][]', 'dev')
          .field('tags[0]', 'a')
          .field('tags[1]', 'b')
          .field('color', 'red')
          .field('color', 'blue'),
      );
      expect(res.body.body).toEqual({
        user: { name: 'Ada', roles: ['admin', 'dev'] },
        tags: ['a', 'b'],
        color: ['red', 'blue'],
      });
    });

    it('should pass non-multipart requests through', async () => {
      const res = await expectParity(http =>
        http.post('/single').send({ json: true }),
      );
      expect(res).toEqual({
        status: 201,
        body: { body: { json: true }, files: 'undefined' },
      });
    });

    it('should ignore an empty file input (no filename)', async () => {
      const res = await expectParity(http =>
        http
          .post('/single')
          .attach('avatar', Buffer.alloc(0), { filename: '' }),
      );
      expect(res.status).toBe(201);
      expect(res.body.file).toBeUndefined();
    });
  });

  describe('malformed bodies', () => {
    const boundary = '----nestboundary';
    const head =
      `--${boundary}\r\n` +
      'Content-Disposition: form-data; name="avatar"; filename="a.txt"\r\n' +
      'Content-Type: text/plain\r\n\r\n';

    it('should reject a body without a boundary', async () => {
      const res = await expectParity(http =>
        http
          .post('/single')
          .set('Content-Type', 'multipart/form-data')
          .send('whatever'),
      );
      expect(res.body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Multipart: Boundary not found',
      });
    });

    it('should reject a body that ends in the middle of a file', async () => {
      const res = await expectParity(http =>
        http
          .post('/single')
          .set('Content-Type', `multipart/form-data; boundary=${boundary}`)
          .send(head + 'partial content'),
      );
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/^Multipart: Unexpected end of/);
    });

    it('should reject a body that ends between parts', async () => {
      const res = await expectParity(http =>
        http
          .post('/single')
          .set('Content-Type', `multipart/form-data; boundary=${boundary}`)
          .send(
            `--${boundary}\r\n` +
              'Content-Disposition: form-data; name="a"\r\n\r\n1\r\n',
          ),
      );
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/^Multipart: Unexpected end of/);
    });
  });

  describe('field names', () => {
    it('should decode escaped characters in field names', async () => {
      const res = await expectParity(http =>
        http.post('/none').field('a%22b%0Ac', '1'),
      );
      expect(res.body.body).toEqual({ 'a"b\nc': '1' });
    });

    it('should decode escaped characters in file names', async () => {
      const boundary = '----nestboundary';
      const res = await expectParity(http =>
        http
          .post('/single')
          .set('Content-Type', `multipart/form-data; boundary=${boundary}`)
          .send(
            `--${boundary}\r\n` +
              'Content-Disposition: form-data; name="avatar"; filename="a%22b%0Ac.txt"\r\n' +
              'Content-Type: text/plain\r\n\r\nhello\r\n' +
              `--${boundary}--\r\n`,
          ),
      );
      expect(res.body.file.originalname).toBe('a"b\nc.txt');
    });
  });

  describe('ParseFilePipe', () => {
    it('should accept a valid file', async () => {
      const res = await expectParity(http =>
        http.post('/validated').attach('avatar', PNG, {
          filename: 'dot.png',
          contentType: 'image/png',
        }),
      );
      expect(res.status).toBe(201);
      expect(res.body.file.size).toBe(PNG.length);
    });

    it('should reject a file over maxSize', async () => {
      const big = Buffer.concat([PNG, Buffer.alloc(100)]);
      const res = await expectParity(http =>
        http.post('/validated').attach('avatar', big, {
          filename: 'big.png',
          contentType: 'image/png',
        }),
      );
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/expected size is less than 100/);
    });

    it('should reject a file whose bytes are not the declared type', async () => {
      const res = await expectParity(http =>
        http.post('/validated').attach('avatar', text('not a png'), {
          filename: 'x.png',
          contentType: 'image/png',
        }),
      );
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/expected type is image\/png/);
    });

    it('should reject a missing file', async () => {
      const res = await expectParity(http =>
        http.post('/validated').field('x', 'y'),
      );
      expect(res.body).toMatchObject({
        statusCode: 400,
        message: 'File is required',
      });
    });
  });

  describe('interceptors', () => {
    it('FilesInterceptor should populate req.files with an array', async () => {
      const res = await expectParity(http =>
        http
          .post('/many')
          .attach('docs', text('one'), txt('1.txt'))
          .attach('docs', text('two'), txt('2.txt')),
      );
      expect(res.status).toBe(201);
      expect(res.body.files.map((f: any) => f.content)).toEqual(['one', 'two']);
    });

    it('FilesInterceptor should reject files over maxCount', async () => {
      const res = await expectParity(http =>
        http
          .post('/many')
          .attach('docs', text('1'), txt('1.txt'))
          .attach('docs', text('2'), txt('2.txt'))
          .attach('docs', text('3'), txt('3.txt')),
      );
      expect(res.body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Unexpected file field - docs',
      });
    });

    it('FileFieldsInterceptor should group req.files by field', async () => {
      const res = await expectParity(http =>
        http
          .post('/fields')
          .attach('background', text('b1'), txt('b1.txt'))
          .attach('avatar', text('a'), txt('a.txt'))
          .attach('background', text('b2'), txt('b2.txt')),
      );
      expect(res.status).toBe(201);
      expect(Object.keys(res.body.files)).toEqual(['background', 'avatar']);
      expect(res.body.files.background).toHaveLength(2);
    });

    it('AnyFilesInterceptor should accept files in any field', async () => {
      const res = await expectParity(http =>
        http
          .post('/any')
          .attach('x', text('1'), txt('1.txt'))
          .attach('y', text('2'), txt('2.txt')),
      );
      expect(res.body.files.map((f: any) => f.fieldname)).toEqual(['x', 'y']);
    });

    it('NoFilesInterceptor should accept text fields', async () => {
      const res = await expectParity(http =>
        http.post('/none').field('a', '1').field('b', '2'),
      );
      expect(res).toEqual({
        status: 201,
        body: {
          body: { a: '1', b: '2' },
          file: 'undefined',
          files: 'undefined',
        },
      });
    });

    it('NoFilesInterceptor should reject a file', async () => {
      const res = await expectParity(http =>
        http
          .post('/none')
          .field('a', '1')
          .attach('avatar', text('x'), txt('x.txt')),
      );
      expect(res.body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Unexpected file field - avatar',
      });
    });

    it('should reject a file in an unexpected field', async () => {
      const res = await expectParity(http =>
        http.post('/single').attach('other', text('x'), txt('x.txt')),
      );
      expect(res.body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Unexpected file field - other',
      });
    });
  });

  describe('limits', () => {
    it('should accept a file of exactly fileSize bytes', async () => {
      const res = await expectParity(http =>
        http.post('/limited').attach('f', text('1234'), txt('ok.txt')),
      );
      expect(res.status).toBe(201);
      expect(res.body.files[0].size).toBe(4);
    });

    it('should reject (not truncate) a file over fileSize', async () => {
      const res = await expectParity(http =>
        http.post('/limited').attach('f', text('12345'), txt('big.txt')),
      );
      expect(res.body).toEqual({
        statusCode: 413,
        error: 'Payload Too Large',
        message: 'File too large',
      });
    });

    it('should reject too many files', async () => {
      const res = await expectParity(http =>
        http
          .post('/limited')
          .attach('f', text('1'), txt('1.txt'))
          .attach('f', text('2'), txt('2.txt'))
          .attach('f', text('3'), txt('3.txt')),
      );
      expect(res.body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Too many files',
      });
    });

    it('should reject too many fields', async () => {
      const res = await expectParity(http =>
        http.post('/limited').field('a', '1').field('b', '2').field('c', '3'),
      );
      expect(res.body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Too many fields',
      });
    });

    it('should reject too many parts', async () => {
      const ok = await expectParity(http =>
        http.post('/parts').field('a', '1').field('b', '2'),
      );
      expect(ok.status).toBe(201);
      const res = await expectParity(http =>
        http.post('/parts').field('a', '1').field('b', '2').field('c', '3'),
      );
      expect(res.body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Too many parts',
      });
    });

    it('should reject a field value over fieldSize', async () => {
      const ok = await expectParity(http =>
        http.post('/text-limits').field('name', 'ab'),
      );
      expect(ok.body).toEqual({ body: { name: 'ab' } });
      const res = await expectParity(http =>
        http.post('/text-limits').field('name', 'abcd'),
      );
      expect(res.body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Field value too long - name',
      });
    });

    it('should reject a field name over fieldNameSize', async () => {
      const res = await expectParity(http =>
        http.post('/text-limits').field('toolong', 'a'),
      );
      expect(res.body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Field name too long',
      });
    });

    it('should merge module-level limits with route limits', async () => {
      const withDefaults = {} as Record<AdapterName, INestApplication>;
      const booted: { app: INestApplication; dir: string }[] = [];
      for (const adapterName of adapterNames) {
        const result = await boot(adapterName, { limits: { fileSize: 2 } });
        booted.push(result);
        withDefaults[adapterName] = result.app;
      }
      try {
        const tooBig = await expectParity(
          http => http.post('/defaults').attach('f', text('123'), txt('a.txt')),
          withDefaults,
        );
        expect(tooBig.status).toBe(413);
        const tooMany = await expectParity(
          http =>
            http
              .post('/defaults')
              .attach('f', text('1'), txt('a.txt'))
              .attach('f', text('2'), txt('b.txt')),
          withDefaults,
        );
        expect(tooMany.body.message).toBe('Too many files');
      } finally {
        for (const { app, dir } of booted) {
          await app.close();
          removeDirs(dir);
        }
      }
    });
  });

  describe('fileFilter', () => {
    it('should skip rejected files and propagate filter errors', async () => {
      const res = await expectParity(http =>
        http
          .post('/filtered')
          .attach('f', text('keep'), txt('keep.txt'))
          .attach('f', text('{}'), {
            filename: 'skip.json',
            contentType: 'application/json',
          }),
      );
      expect(res.body.files.map((f: any) => f.originalname)).toEqual([
        'keep.txt',
      ]);

      const err = await expectParity(http =>
        http.post('/filtered').attach('f', text('MZ'), {
          filename: 'evil.exe',
          contentType: 'application/octet-stream',
        }),
      );
      expect(err.body).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: 'No executables',
      });
    });
  });

  describe('disk storage', () => {
    it('should write files to dest', async () => {
      const res = await expectParity(http =>
        http.post('/disk').attach('docs', text('on disk'), txt('d.txt')),
      );
      expect(res.body.files[0]).toMatchObject({
        keys: [
          'fieldname',
          'originalname',
          'encoding',
          'mimetype',
          'path',
          'destination',
          'filename',
          'size',
        ],
        size: 7,
        onDisk: true,
      });
      for (const adapterName of adapterNames) {
        const [name] = readdirSync(dirs[adapterName]);
        expect(name).toMatch(/^[0-9a-f]{32}$/);
        expect(readFileSync(join(dirs[adapterName], name), 'utf8')).toBe(
          'on disk',
        );
        rmSync(join(dirs[adapterName], name));
      }
    });

    it('should remove already written files when the request fails', async () => {
      const res = await expectParity(http =>
        http
          .post('/disk')
          .attach('docs', text('fine'), txt('1.txt'))
          .attach('docs', text('fine too'), txt('2.txt'))
          .attach('docs', text('way past ten bytes'), txt('3.txt')),
      );
      expect(res.status).toBe(413);
      expect(readdirSync(dirs.express)).toEqual([]);
      expect(readdirSync(dirs.fastify)).toEqual([]);
    });

    it('should report a storage engine error', async () => {
      // Large enough that the file is still arriving when the engine fails.
      const res = await expectParity(http =>
        http
          .post('/unwritable')
          .attach('doc', Buffer.alloc(512 * 1024), txt('a.txt')),
      );
      expect(res).toEqual({
        status: 500,
        body: { statusCode: 500, message: 'Internal server error' },
      });
    });

    it.each([
      ['dest', '/disk', 'docs', (dir: string) => dir],
      ["multer's diskStorage", '/engine-disk', 'doc', engineDir],
    ])(
      'should remove the partial file when the client disconnects mid-upload (%s)',
      async (_, path, fieldName, dirOf) => {
        for (const adapterName of adapterNames) {
          const dir = dirOf(dirs[adapterName]);
          const { port } = apps[adapterName]
            .getHttpServer()
            .address() as AddressInfo;
          const socket = connect(port, '127.0.0.1');
          await once(socket, 'connect');
          const boundary = '----nestboundary';
          socket.write(
            `POST ${path} HTTP/1.1\r\nHost: 127.0.0.1\r\n` +
              `Content-Type: multipart/form-data; boundary=${boundary}\r\n` +
              'Content-Length: 1000000\r\n\r\n' +
              `--${boundary}\r\n` +
              `Content-Disposition: form-data; name="${fieldName}"; filename="a.bin"\r\n` +
              'Content-Type: application/octet-stream\r\n\r\npart',
          );
          try {
            await vi.waitFor(() => expect(readdirSync(dir)).toHaveLength(1));
          } finally {
            socket.destroy();
          }
          await vi.waitFor(() => expect(readdirSync(dir)).toEqual([]));
        }
      },
    );
  });

  describe('streaming (FileStreamInterceptor on Fastify, memory on Express)', () => {
    const payload = Buffer.alloc(48 * 1024, 'nest');
    const expectedHash = createHash('sha256').update(payload).digest('hex');

    it('should produce the same hash as the buffered upload', async () => {
      const res = await expectParity(http =>
        http
          .post('/hash')
          .field('purpose', 'backup')
          .attach('upload', payload, {
            filename: 'blob.bin',
            contentType: 'application/octet-stream',
          }),
      );
      expect(res.body).toEqual({
        hash: expectedHash,
        size: payload.length,
        originalname: 'blob.bin',
        body: { purpose: 'backup' },
      });
    });

    it('should reject a file over fileSize', async () => {
      const big = Buffer.alloc(64 * 1024 + 1);
      const res = await expectParity(http =>
        http.post('/hash').attach('upload', big, {
          filename: 'big.bin',
          contentType: 'application/octet-stream',
        }),
      );
      expect(res.body).toEqual({
        statusCode: 413,
        error: 'Payload Too Large',
        message: 'File too large',
      });
    });

    it('should reject a file over fileSize within the first chunk', async () => {
      const res = await expectParity(http =>
        http.post('/hash-small').attach('upload', text('0123456789'), {
          filename: 'small.bin',
          contentType: 'application/octet-stream',
        }),
      );
      expect(res.body).toEqual({
        statusCode: 413,
        error: 'Payload Too Large',
        message: 'File too large',
      });
    });

    it('should reject a file in another field', async () => {
      const res = await expectParity(http =>
        http.post('/hash').attach('nope', text('x'), txt('x.txt')),
      );
      expect(res.body.message).toBe('Unexpected file field - nope');
    });
  });
});
