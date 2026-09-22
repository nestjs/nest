import multipart from '@fastify/multipart';
import {
  Body,
  Controller,
  type INestApplication,
  Module,
  Post,
  Req,
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
import { mkdtempSync, readdirSync, rmSync } from 'fs';
import { Agent } from 'http';
import { tmpdir } from 'os';
import { join } from 'path';
import request from 'supertest';
import { createApp, txt } from './utils.js';

const uploadDir = mkdtempSync(join(tmpdir(), 'nest-upload-custom-'));

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

    it('should reject field names that would pollute a prototype', async () => {
      // multer accepts these (into a null-prototype body); @fastify/multipart
      // and this package reject them.
      for (const name of ['constructor', '__proto__[x]', 'a[constructor]']) {
        const res = await http().post('/fields').field(name, '1');
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/^Invalid field name/);
      }
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
