import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { mkdtempSync, rmSync } from 'fs';
import * as http from 'http';
import { tmpdir } from 'os';
import { join } from 'path';
import { AppModule } from '../src/app.module.js';

const get = (socketPath: string) =>
  new Promise<{ statusCode?: number; body: string }>((resolve, reject) => {
    http
      .get({ socketPath, path: '/hello' }, response => {
        let body = '';
        response.on('data', chunk => (body += chunk));
        response.on('end', () =>
          resolve({ statusCode: response.statusCode, body }),
        );
      })
      .on('error', reject);
  });

// A Windows named pipe is not a file path, so the `+unix://` form does not apply.
describe.skipIf(process.platform === 'win32')(
  'Listen on a socket path (fastify adapter)',
  () => {
    let app: NestFastifyApplication;
    let directory: string;
    let socketPath: string;

    beforeEach(async () => {
      directory = mkdtempSync(join(tmpdir(), 'nest-listen-'));
      socketPath = join(directory, 'app.sock');
      const module = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();
      app = module.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter(),
      );
    });

    afterEach(async () => {
      await app.close();
      rmSync(directory, { recursive: true, force: true });
    });

    it('should listen on the socket path and answer a request', async () => {
      await app.listen(socketPath);

      const { statusCode, body } = await get(socketPath);

      expect(statusCode).toBe(200);
      expect(body).toBe('Hello world!');
    });

    it('should listen on the socket path when a host is given', async () => {
      await app.listen(socketPath, '127.0.0.1');

      const { statusCode } = await get(socketPath);

      expect(statusCode).toBe(200);
    });

    it('should return the +unix:// url of the socket path', async () => {
      await app.listen(socketPath);

      expect(await app.getUrl()).toBe(
        `http+unix://${encodeURIComponent(socketPath)}`,
      );
    });
  },
);
