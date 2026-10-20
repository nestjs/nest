import { StreamableFile } from '@nestjs/common';
import { createReadStream } from 'fs';
import { join } from 'path';
import { Readable } from 'stream';
import { FastifyAdapter } from '../../adapters/fastify-adapter.js';

describe('FastifyAdapter HEAD requests', () => {
  let adapter: FastifyAdapter;

  beforeEach(() => {
    adapter = new FastifyAdapter();
  });

  afterEach(async () => {
    await adapter.close();
  });

  describe('for a StreamableFile', () => {
    const chunkCount = 1000;
    const chunk = Buffer.alloc(1024);
    const length = chunkCount * chunk.length;
    let reads: number;
    let source: Readable;

    beforeEach(() => {
      reads = 0;
      source = new Readable({
        read() {
          this.push(++reads > chunkCount ? null : chunk);
        },
      });
    });

    const fileWithHeaders = () =>
      new StreamableFile(source, {
        type: 'text/markdown',
        disposition: 'attachment; filename="file.md"',
        length,
      });

    // A GET route answers HEAD through Fastify's HEAD route, whose onSend
    // handler resumes a stream payload. A HEAD route, like a raw response,
    // pipes the payload into a response that discards it.
    it.each([
      ['a GET route', 'get', false],
      ['a HEAD route', 'head', false],
      ['a raw response', 'get', true],
    ] as const)(
      'should send the headers of the file without reading it (%s)',
      async (_, method, isRaw) => {
        adapter[method]('/file', (_req, reply) =>
          adapter.reply(isRaw ? reply.raw : reply, fileWithHeaders()),
        );

        const response = await adapter.inject({ method: 'HEAD', url: '/file' });
        await vi.waitFor(() => expect(source.destroyed).toBe(true));

        expect(reads).toBe(0);
        expect(response.statusCode).toBe(200);
        expect(response.headers).toMatchObject({
          'content-type': 'text/markdown',
          'content-disposition': 'attachment; filename="file.md"',
          'content-length': `${length}`,
        });
        expect(response.payload).toBe('');
      },
    );

    it('should still send the whole file for a GET request', async () => {
      adapter.get('/file', (_req, reply) =>
        adapter.reply(reply, fileWithHeaders()),
      );

      const response = await adapter.inject({ method: 'GET', url: '/file' });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-length']).toBe(`${length}`);
      expect(response.rawPayload.length).toBe(length);
    });

    it('should leave no unhandled error when the file cannot be opened', async () => {
      // fs.createReadStream() still emits ENOENT when destroyed before the
      // open fails
      const missing = createReadStream(
        join(import.meta.dirname, 'does-not-exist.txt'),
      );
      adapter.get('/file', (_req, reply) =>
        adapter.reply(reply, new StreamableFile(missing)),
      );

      const response = await adapter.inject({ method: 'HEAD', url: '/file' });
      await vi.waitFor(() => expect(missing.closed).toBe(true));

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('application/octet-stream');
      expect(missing.errored).toMatchObject({ code: 'ENOENT' });
    });
  });
});
