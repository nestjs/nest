import { StreamableFile } from '@nestjs/common';
import { expect } from 'chai';
import { createReadStream } from 'fs';
import { join } from 'path';
import { Readable } from 'stream';
import { FastifyAdapter } from '../../adapters/fastify-adapter';

describe('FastifyAdapter HEAD requests', () => {
  let adapter: FastifyAdapter;

  beforeEach(() => {
    adapter = new FastifyAdapter();
  });

  afterEach(async () => {
    await adapter.close();
  });

  const waitFor = async (condition: () => boolean) => {
    for (let i = 0; i < 100 && !condition(); i++) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  };

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
    (
      [
        ['a GET route', 'get', false],
        ['a HEAD route', 'head', false],
        ['a raw response', 'get', true],
      ] as const
    ).forEach(([name, method, isRaw]) => {
      it(`should send the headers of the file without reading it (${name})`, async () => {
        adapter[method]('/file', (_req, reply) =>
          adapter.reply(isRaw ? reply.raw : reply, fileWithHeaders()),
        );

        const response = await adapter.inject({ method: 'HEAD', url: '/file' });
        await waitFor(() => source.destroyed);

        expect(source.destroyed).to.be.true;
        expect(reads).to.equal(0);
        expect(response.statusCode).to.equal(200);
        expect(response.headers).to.include({
          'content-type': 'text/markdown',
          'content-disposition': 'attachment; filename="file.md"',
          'content-length': `${length}`,
        });
        expect(response.payload).to.equal('');
      });
    });

    it('should still send the whole file for a GET request', async () => {
      adapter.get('/file', (_req, reply) =>
        adapter.reply(reply, fileWithHeaders()),
      );

      const response = await adapter.inject({ method: 'GET', url: '/file' });

      expect(response.statusCode).to.equal(200);
      expect(response.headers['content-length']).to.equal(`${length}`);
      expect(response.rawPayload.length).to.equal(length);
    });

    it('should leave no unhandled error when the file cannot be opened', async () => {
      // fs.createReadStream() still emits ENOENT when destroyed before the
      // open fails
      const missing = createReadStream(join(__dirname, 'does-not-exist.txt'));
      adapter.get('/file', (_req, reply) =>
        adapter.reply(reply, new StreamableFile(missing)),
      );

      const response = await adapter.inject({ method: 'HEAD', url: '/file' });
      await waitFor(() => missing.closed);

      expect(missing.closed).to.be.true;
      expect(response.statusCode).to.equal(200);
      expect(response.headers['content-type']).to.equal(
        'application/octet-stream',
      );
      expect(missing.errored).to.include({ code: 'ENOENT' });
    });
  });
});
