import type { INestApplication, NestApplicationOptions } from '@nestjs/common';
import { NodeAdapter } from '@nestjs/platform-node';
import { once } from 'events';
import { readdirSync, readFileSync, rmSync } from 'fs';
import * as http2 from 'http2';
import * as https from 'https';
import type { AddressInfo } from 'net';
import { join } from 'path';
import { createApp } from '../src/adapters.js';
import {
  NodeHttp2Module,
  uploadDir,
} from '../src/node-http2/node-http2.module.js';

// A throwaway self-signed certificate (CN=localhost), shared with the TLS
// tests of the microservices package
const tlsDir = join(import.meta.dirname, '../../microservices/src/tcp-tls');
const key = readFileSync(join(tlsDir, 'privkey.pem'));
const cert = readFileSync(join(tlsDir, 'ca.cert.pem'));

interface Http2Response {
  headers: http2.IncomingHttpHeaders;
  text: string;
}

function send(
  session: http2.ClientHttp2Session,
  headers: http2.OutgoingHttpHeaders,
  body?: string | Buffer,
): Promise<Http2Response> {
  return new Promise((resolve, reject) => {
    const req = session.request(headers);
    let text = '';
    let responseHeaders: http2.IncomingHttpHeaders = {};
    req.setEncoding('utf8');
    req.on('response', received => (responseHeaders = received));
    req.on('data', chunk => (text += chunk));
    req.on('end', () => resolve({ headers: responseHeaders, text }));
    req.on('error', reject);
    req.end(body);
  });
}

describe('Node adapter over HTTP/2', () => {
  let app: INestApplication;
  let session: http2.ClientHttp2Session;

  const start = async (options?: NestApplicationOptions) => {
    app = await createApp(
      'node',
      NodeHttp2Module,
      undefined,
      options,
      new NodeAdapter({ http2: true }),
    );
    const { port } = app.getHttpServer().address() as AddressInfo;
    session = options?.httpsOptions
      ? http2.connect(`https://localhost:${port}`, { ca: cert })
      : http2.connect(`http://127.0.0.1:${port}`);
    session.on('error', () => {});
    return port;
  };

  afterEach(async () => {
    session?.destroy();
    await app?.close();
  });

  afterAll(() => {
    rmSync(uploadDir, { recursive: true, force: true });
  });

  describe('in clear text (h2c)', () => {
    beforeEach(() => start());

    it('should route requests and fill the request helpers', async () => {
      const res = await send(session, { ':path': '/' });

      expect(res.headers[':status']).toBe(200);
      expect(JSON.parse(res.text)).toEqual({
        httpVersion: '2.0',
        protocol: 'http',
        hostname: '127.0.0.1',
        secure: false,
      });
    });

    it('should parse a body sent without a content length', async () => {
      // A stream of unknown length, as HTTP/2 has no chunked encoding
      const res = await send(
        session,
        {
          ':method': 'POST',
          ':path': '/echo',
          'content-type': 'application/json',
        },
        '{"name":"nest"}',
      );

      expect(res.headers[':status']).toBe(201);
      expect(JSON.parse(res.text)).toEqual({ body: { name: 'nest' } });
    });

    it('should answer exceptions through the exception filters', async () => {
      const res = await send(session, { ':path': '/error' });

      expect(res.headers[':status']).toBe(400);
      expect(JSON.parse(res.text)).toEqual({
        statusCode: 400,
        message: 'Bad value',
        error: 'Bad Request',
      });
    });

    it('should stream a StreamableFile', async () => {
      const res = await send(session, { ':path': '/file' });

      expect(res.headers[':status']).toBe(200);
      expect(res.headers['content-type']).toBe('text/plain');
      expect(res.text).toBe('file content');
    });

    it('should stream server-sent events without connection headers', async () => {
      const res = await send(session, { ':path': '/events' });

      expect(res.headers[':status']).toBe(200);
      expect(res.headers['content-type']).toBe('text/event-stream');
      expect(res.headers.connection).toBeUndefined();
      expect(res.text).toBe(
        '\nid: 1\ndata: {"i":0}\n\nid: 2\ndata: {"i":1}\n\nid: 3\ndata: {"i":2}\n\n',
      );
    });

    it('should store an uploaded file', async () => {
      const boundary = 'nestboundary';
      const body =
        `--${boundary}\r\n` +
        'Content-Disposition: form-data; name="doc"; filename="a.txt"\r\n' +
        'Content-Type: text/plain\r\n\r\nhello\r\n' +
        `--${boundary}--\r\n`;
      // multer reads a multipart body only with a length, as browsers send
      const res = await send(
        session,
        {
          ':method': 'POST',
          ':path': '/upload',
          'content-type': `multipart/form-data; boundary=${boundary}`,
          'content-length': Buffer.byteLength(body),
        },
        body,
      );

      expect(res.headers[':status']).toBe(201);
      expect(JSON.parse(res.text)).toEqual({ size: 5 });
    });

    it('should remove the partial file when the client cancels the upload', async () => {
      for (const file of readdirSync(uploadDir)) {
        rmSync(`${uploadDir}/${file}`);
      }
      const boundary = 'nestboundary';
      const req = session.request({
        ':method': 'POST',
        ':path': '/upload',
        'content-type': `multipart/form-data; boundary=${boundary}`,
        'content-length': 1000000,
      });
      req.on('error', () => {});
      req.write(
        `--${boundary}\r\n` +
          'Content-Disposition: form-data; name="doc"; filename="a.bin"\r\n' +
          'Content-Type: application/octet-stream\r\n\r\npart',
      );
      await vi.waitFor(() => expect(readdirSync(uploadDir)).toHaveLength(1));

      req.close(http2.constants.NGHTTP2_CANCEL);

      await vi.waitFor(() => expect(readdirSync(uploadDir)).toEqual([]));
    });

    it('should close while a client keeps its session open', async () => {
      await send(session, { ':path': '/' });
      const goaway = once(session, 'goaway');

      // Before Node.js 24, the server waits for its sessions to close
      await app.close();

      await goaway;
      app = undefined!;
    });
  });

  describe('over TLS', () => {
    it('should report https and serve HTTP/1 clients with allowHTTP1', async () => {
      const port = await start({
        httpsOptions: { key, cert, allowHTTP1: true },
      });

      const res = await send(session, { ':path': '/' });
      const http1 = await new Promise<string>((resolve, reject) =>
        https
          .get({ host: 'localhost', port, ca: cert, agent: false }, msg => {
            let text = '';
            msg.on('data', chunk => (text += chunk));
            msg.on('end', () => resolve(text));
          })
          .on('error', reject),
      );

      expect(await app.getUrl()).toBe(`https://127.0.0.1:${port}`);
      expect(JSON.parse(res.text)).toEqual({
        httpVersion: '2.0',
        protocol: 'https',
        hostname: 'localhost',
        secure: true,
      });
      expect(JSON.parse(http1)).toMatchObject({
        httpVersion: '1.1',
        protocol: 'https',
      });
    });
  });
});
