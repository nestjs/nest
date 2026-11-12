import multipart from '@fastify/multipart';
import {
  Body,
  type CallHandler,
  Controller,
  type ExecutionContext,
  type INestApplication,
  Module,
  type NestInterceptor,
  Post,
  Req,
  RequestTimeoutException,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import * as root from '@nestjs/platform-fastify';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import {
  diskStorage,
  FileInterceptor,
  FileStreamInterceptor,
  MultipartModule,
  NoFilesInterceptor,
} from '@nestjs/platform-fastify/multipart';
import { once } from 'events';
import { mkdtempSync, readdirSync, rmSync } from 'fs';
import { Agent } from 'http';
import type { AddressInfo } from 'net';
import { connect } from 'net';
import { throwError, timeout } from 'rxjs';
import { tmpdir } from 'os';
import { join } from 'path';
import request from 'supertest';
import { createApp, txt } from './utils.js';

const uploadDir = mkdtempSync(join(tmpdir(), 'nest-upload-custom-'));

/** Answers with a 408 when the route has not answered within a second. */
class TimeoutInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      timeout({
        first: 1000,
        with: () => throwError(() => new RequestTimeoutException()),
      }),
    );
  }
}

/** How the handler of `/slow-stream` finished reading its upload. */
const slowStreamOutcomes: string[] = [];

@Controller()
class FastifyUploadController {
  @Post('where')
  @UseInterceptors(FileInterceptor('avatar'))
  where(@UploadedFile() file: any, @Req() req: any) {
    return {
      sameObject: req.file === file,
      onFastifyRequest: Object.hasOwn(req, 'file'),
      onRawRequest: 'file' in req.raw,
    };
  }

  @Post('custom-disk')
  @UseInterceptors(
    FileInterceptor('doc', {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, uploadDir),
        filename: (_req, file, cb) => cb(null, `custom-${file.originalname}`),
      }),
    }),
  )
  customDisk(@UploadedFile() file: any) {
    return { filename: file.filename, path: file.path };
  }

  @Post('plugin-limits')
  @UseInterceptors(FileInterceptor('doc'))
  pluginLimits(@UploadedFile() file: any) {
    return { size: file.size };
  }

  // As with `fileSize: config.get(...)` for a setting that is not set.
  @Post('undefined-limits')
  @UseInterceptors(FileInterceptor('doc', { limits: { fileSize: undefined } }))
  undefinedLimits(@UploadedFile() file: any) {
    return { size: file.size };
  }

  @Post('fields')
  @UseInterceptors(NoFilesInterceptor())
  fields(@Body() body: any) {
    return { body };
  }

  @Post('ignore-stream')
  @UseInterceptors(
    FileStreamInterceptor('upload', { limits: { fileSize: 8 * 1024 * 1024 } }),
  )
  ignoreStream(@UploadedFile() file: any) {
    return { name: file.originalname };
  }

  @Post('slow-stream')
  @UseInterceptors(TimeoutInterceptor, FileStreamInterceptor('upload'))
  async slowStream(@UploadedFile() file: any) {
    try {
      for await (const _chunk of file.stream) {
        // Reads it all, as a handler writing it to disk would.
      }
      slowStreamOutcomes.push('end');
    } catch (err) {
      slowStreamOutcomes.push(err.message);
    }
    return {};
  }

  @Post('echo')
  @UseInterceptors(
    FileStreamInterceptor('upload', { limits: { fileSize: 1024 } }),
  )
  echo(@UploadedFile() file: any) {
    return new StreamableFile(file.stream, { type: file.mimetype });
  }
}

@Module({ controllers: [FastifyUploadController] })
class FastifyUploadModule {}

describe('File upload (Fastify)', () => {
  afterAll(() => rmSync(uploadDir, { recursive: true, force: true }));

  const limits = { limits: { fileSize: 8 } };
  const instanceOf = (app: NestFastifyApplication) =>
    app.getHttpAdapter().getInstance();

  describe.each([
    [
      'registered by the adapter, with options',
      () =>
        createApp('fastify', FastifyUploadModule, {
          adapter: new FastifyAdapter({ multipart: limits }),
        }),
    ],
    [
      'registered through app.register() before init',
      () =>
        createApp('fastify', FastifyUploadModule, {
          setup: app => app.register(multipart, limits),
        }),
    ],
    [
      'registered through app.register() after init',
      () =>
        createApp('fastify', FastifyUploadModule, {
          afterInit: app => app.register(multipart, limits),
        }),
    ],
    [
      'registered on the Fastify instance before init (not awaited)',
      () =>
        createApp('fastify', FastifyUploadModule, {
          setup: app => {
            void instanceOf(app).register(multipart, limits);
          },
        }),
    ],
    [
      'registered on the Fastify instance before init (awaited)',
      () =>
        createApp('fastify', FastifyUploadModule, {
          setup: app => instanceOf(app).register(multipart, limits),
        }),
    ],
    [
      'registered by the user, with the adapter option set to false',
      () =>
        createApp('fastify', FastifyUploadModule, {
          adapter: new FastifyAdapter({ multipart: false }),
          setup: app => instanceOf(app).register(multipart, limits),
        }),
    ],
  ])('with @fastify/multipart %s', (_, boot) => {
    let app: INestApplication;
    const http = () => request(app.getHttpServer());

    beforeAll(async () => {
      app = await boot();
    });
    afterAll(() => app.close());

    it('should expose the file on the Fastify request, not on req.raw', async () => {
      const res = await http()
        .post('/where')
        .attach('avatar', Buffer.from('x'), txt('a.txt'));
      expect(res.body).toEqual({
        sameObject: true,
        onFastifyRequest: true,
        onRawRequest: false,
      });
    });

    it('should support diskStorage with destination and filename functions', async () => {
      const res = await http()
        .post('/custom-disk')
        .attach('doc', Buffer.from('abc'), txt('a.txt'));
      expect(res.body).toEqual({
        filename: 'custom-a.txt',
        path: join(uploadDir, 'custom-a.txt'),
      });
      expect(readdirSync(uploadDir)).toEqual(['custom-a.txt']);
      rmSync(join(uploadDir, 'custom-a.txt'));
    });

    it('should apply the plugin limits when the route sets none', async () => {
      await http()
        .post('/plugin-limits')
        .attach('doc', Buffer.from('12345678'), txt('ok.txt'))
        .expect(201);
      await http()
        .post('/plugin-limits')
        .attach('doc', Buffer.from('123456789'), txt('big.txt'))
        .expect(413);
    });

    it('should apply the plugin limits the route leaves undefined', async () => {
      await http()
        .post('/undefined-limits')
        .attach('doc', Buffer.from('123456789'), txt('big.txt'))
        .expect(413);
    });

    it('should reject field names that would pollute a prototype', async () => {
      // multer accepts these (into a null-prototype body); @fastify/multipart
      // and this package reject them.
      for (const name of ['constructor', '__proto__[x]', 'a[constructor]']) {
        const res = await http().post('/fields').field(name, '1');
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/^Invalid field name/);
      }
    });

    it('should hand over JSON fields parsed, up to jsonFieldsSize in all', async () => {
      const json = { contentType: 'application/json' };
      const ok = await http()
        .post('/fields')
        .field('meta', '{"a":[1,2]}', json as any);
      expect(ok.body).toEqual({ body: { meta: { a: [1, 2] } } });
      const big = JSON.stringify({ s: 'x'.repeat(600 * 1024) });
      const res = await http()
        .post('/fields')
        .field('a', big, json as any)
        .field('b', big, json as any);
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('JSON field values too large - b');
    });

    it('should fail the stream of a handler still reading it when a timeout answers', async () => {
      slowStreamOutcomes.length = 0;
      const { port } = app.getHttpServer().address() as AddressInfo;
      const socket = connect(port, '127.0.0.1');
      await once(socket, 'connect');
      const boundary = '----nestboundary';
      socket.write(
        'POST /slow-stream HTTP/1.1\r\nHost: 127.0.0.1\r\n' +
          `Content-Type: multipart/form-data; boundary=${boundary}\r\n` +
          'Content-Length: 1000000\r\n\r\n' +
          `--${boundary}\r\n` +
          'Content-Disposition: form-data; name="upload"; filename="a.bin"\r\n' +
          'Content-Type: application/octet-stream\r\n\r\npart',
      );
      try {
        const [response] = await once(socket, 'data');
        expect(String(response)).toMatch(/^HTTP\/1\.1 408 /);
        // The client stays connected and sends nothing more.
        await vi.waitFor(() =>
          expect(slowStreamOutcomes).toEqual([
            'The rest of the upload was discarded, as it had not been read when the request was answered',
          ]),
        );
      } finally {
        socket.destroy();
      }
    });

    it('should remove the stored file when the client leaves a form the parser never finishes', async () => {
      const { port } = app.getHttpServer().address() as AddressInfo;
      const socket = connect(port, '127.0.0.1');
      await once(socket, 'connect');
      const boundary = '----nestboundary';
      // The second part has a header line but no empty line after it, so
      // @fastify/busboy never emits it, nor finishes the form.
      const body =
        `--${boundary}\r\n` +
        'Content-Disposition: form-data; name="doc"; filename="stall.txt"\r\n' +
        'Content-Type: text/plain\r\n\r\n' +
        'data\r\n' +
        `--${boundary}\r\n` +
        'Content-Disposition: form-data; name="x"\r\n' +
        `--${boundary}--\r\n`;
      socket.write(
        'POST /custom-disk HTTP/1.1\r\nHost: 127.0.0.1\r\n' +
          `Content-Type: multipart/form-data; boundary=${boundary}\r\n` +
          `Content-Length: ${Buffer.byteLength(body)}\r\n\r\n` +
          body,
      );
      const stored = () =>
        readdirSync(uploadDir).filter(name => name === 'custom-stall.txt');
      try {
        await vi.waitFor(() => expect(stored()).toHaveLength(1));
      } finally {
        socket.destroy();
      }
      await vi.waitFor(() => expect(stored()).toEqual([]));
    });

    const upload = (i: number) => ({
      filename: `f${i}.bin`,
      contentType: 'application/octet-stream',
    });
    // Larger than the socket buffers, so the client is still sending the
    // body when the handler returns.
    const payload = Buffer.alloc(4 * 1024 * 1024, 1);

    it('should respond without cutting off the upload when the handler ignores the stream', async () => {
      // supertest sends "Connection: close": the socket closes right after
      // the response, so the rest of the body must be read before it.
      for (let i = 0; i < 3; i++) {
        await http()
          .post('/ignore-stream')
          .attach('upload', payload, upload(i))
          .expect(201, { name: `f${i}.bin` });
      }
    });

    it('should keep a kept-alive connection reusable when the handler ignores the stream', async () => {
      const server = app.getHttpServer();
      let connections = 0;
      const onConnection = () => connections++;
      server.on('connection', onConnection);
      const agent = new Agent({ keepAlive: true, maxSockets: 1 });
      try {
        for (let i = 0; i < 3; i++) {
          await request(server)
            .post('/ignore-stream')
            .agent(agent)
            .attach('upload', payload, upload(i))
            .expect(201, { name: `f${i}.bin` });
        }
        expect(connections).toBe(1);
      } finally {
        agent.destroy();
        server.off('connection', onConnection);
      }
    });

    it('should let the handler pipe the stream back out', async () => {
      const res = await http()
        .post('/echo')
        .attach('upload', Buffer.from('round trip'), txt('echo.txt'))
        .buffer(true)
        .parse((response, cb) => {
          let data = '';
          response.on('data', (chunk: Buffer) => (data += chunk));
          response.on('end', () => cb(null, data));
        });
      expect(res.status).toBe(201);
      expect(res.body).toBe('round trip');
    });
  });

  describe('bootstrap', () => {
    @Controller()
    class UploadController {
      @Post()
      @UseInterceptors(FileInterceptor('file'))
      upload() {}
    }
    @Module({ controllers: [UploadController] })
    class AppModule {}

    it('should register @fastify/multipart without any configuration', async () => {
      const app = await createApp('fastify', AppModule);
      try {
        expect(
          instanceOf(app as NestFastifyApplication).hasContentTypeParser(
            'multipart/form-data',
          ),
        ).toBe(true);
      } finally {
        await app.close();
      }
    });

    it('should not register @fastify/multipart for an app without upload interceptors', async () => {
      @Module({})
      class EmptyModule {}
      const app = await createApp('fastify', EmptyModule);
      try {
        expect(
          instanceOf(app as NestFastifyApplication).hasRequestDecorator(
            'isMultipart',
          ),
        ).toBe(false);
      } finally {
        await app.close();
      }
    });

    it('should fail when the adapter option is false and the plugin is not registered', async () => {
      await expect(
        createApp('fastify', AppModule, {
          adapter: new FastifyAdapter({ multipart: false }),
        }),
      ).rejects.toThrow(/require the "@fastify\/multipart" plugin/);
    });

    it('should fail on the ExpressAdapter, pointing at platform-express', async () => {
      await expect(createApp('express', AppModule)).rejects.toThrow(
        /only work with the FastifyAdapter/,
      );
    });

    it('should re-export the interceptors from the package root', () => {
      expect(root.FileInterceptor).toBe(FileInterceptor);
      expect(root.MultipartModule).toBe(MultipartModule);
    });
  });

  describe('MultipartModule.registerAsync', () => {
    it('should provide default options from a factory', async () => {
      @Controller()
      class UploadController {
        @Post()
        @UseInterceptors(FileInterceptor('file'))
        upload(@UploadedFile() file: any) {
          return { size: file.size };
        }
      }
      @Module({
        imports: [
          MultipartModule.registerAsync({
            useFactory: async () => ({ limits: { fileSize: 2 } }),
          }),
        ],
        controllers: [UploadController],
      })
      class AppModule {}

      const app = await createApp('fastify', AppModule);
      try {
        await request(app.getHttpServer())
          .post('/')
          .attach('file', Buffer.from('12'), txt('a'))
          .expect(201);
        await request(app.getHttpServer())
          .post('/')
          .attach('file', Buffer.from('123'), txt('a'))
          .expect(413);
      } finally {
        await app.close();
      }
    });
  });
});
