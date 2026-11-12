import type { INestApplication } from '@nestjs/common';
import {
  createServer,
  get,
  type IncomingHttpHeaders,
  request as httpRequest,
  Agent,
  type Server,
} from 'http';
import { connect } from 'net';
import { gzipSync } from 'zlib';
import { adapters, createApp } from '../src/adapters.js';
import {
  StreamingModule,
  streaming,
} from '../src/streaming/streaming.module.js';

interface RawResponse {
  status: number;
  headers: IncomingHttpHeaders;
  text: string;
  // Whether the client got the whole response, as told by how it ended
  complete: boolean;
}

describe.each(adapters('express', 'fastify', 'node'))(
  'Streaming responses (%s)',
  name => {
    let app: INestApplication;
    let baseUrl: string;
    let upstream: Server;

    beforeAll(async () => {
      upstream = createServer((req, res) => {
        if (req.url === '/missing') {
          res.statusCode = 404;
          res.end('missing upstream');
          return;
        }
        const body = gzipSync('hello from upstream');
        res.writeHead(200, {
          'content-type': 'text/x-upstream',
          'content-encoding': 'gzip',
          'content-length': body.length,
          'x-upstream': 'yes',
        });
        res.end(body);
      });
      await new Promise<void>(resolve =>
        upstream.listen(0, '127.0.0.1', resolve),
      );
      streaming.upstreamUrl = `http://127.0.0.1:${(upstream.address() as any).port}`;

      app = await createApp(name, StreamingModule);
      baseUrl = await app.getUrl();
    });

    afterAll(async () => {
      await app.close();
      await new Promise(resolve => upstream.close(resolve));
    });

    beforeEach(() => streaming.reset());

    function send(
      path: string,
      options: { method?: string; agent?: Agent } = {},
    ): Promise<RawResponse> {
      return new Promise((resolve, reject) => {
        const req = httpRequest(`${baseUrl}${path}`, options, res => {
          let text = '';
          res.setEncoding('utf8');
          res.on('data', chunk => (text += chunk));
          res.on('close', () =>
            resolve({
              status: res.statusCode!,
              headers: res.headers,
              text,
              complete: res.complete,
            }),
          );
          // An aborted response reports this as well as closing
          res.on('error', () => undefined);
        });
        req.on('error', reject);
        req.end();
      });
    }

    /**
     * Starts a request and leaves when the client has the response headers, or
     * right away, without waiting for anything, when told to.
     */
    function sendAndLeave(path: string, leaveWhen: 'headers' | 'sent') {
      return new Promise<void>((resolve, reject) => {
        const req = get(`${baseUrl}${path}`, res => {
          res.on('error', () => undefined);
          req.destroy();
          resolve();
        });
        req.on('error', err => {
          if (!req.destroyed) {
            reject(err);
          }
        });
        if (leaveWhen === 'sent') {
          req.once('finish', () =>
            setTimeout(() => {
              req.destroy();
              resolve();
            }, 30),
          );
        }
      });
    }

    describe('a web Response', () => {
      it('should send its status, headers and body', async () => {
        const res = await send('/response');

        expect(res.status).toBe(202);
        expect(res.headers['x-from-response']).toBe('yes');
        expect(res.headers['content-type']).toMatch(/^text\/x-custom/);
        expect(res.text).toBe('hello');
        expect(res.complete).toBe(true);
      });

      it('should accept one from a promise and from an Observable', async () => {
        expect((await send('/response/promised')).text).toBe('promised');
        expect((await send('/response/observable')).text).toBe('observed');
      });

      it('should stream a body that is a stream', async () => {
        const res = await send('/response/stream');

        expect(res.status).toBe(200);
        expect(res.text).toBe('from a stream');
        expect(res.headers['transfer-encoding']).toBe('chunked');
      });

      it('should default to application/octet-stream without a Content-Type', async () => {
        const res = await send('/response/stream');

        expect(res.headers['content-type']).toBe('application/octet-stream');
      });

      it('should send what Response.json() makes', async () => {
        const res = await send('/response/json');

        expect(res.status).toBe(400);
        expect(res.headers['content-type']).toMatch(/^application\/json/);
        expect(res.text).toBe('{"ok":true}');
      });

      it('should send every Set-Cookie, after the ones already set', async () => {
        const res = await send('/response/cookies');

        expect(res.headers['set-cookie']).toEqual([
          'from=middleware',
          'a=1',
          'b=2; Path=/',
        ]);
      });

      it('should send a null body as no body', async () => {
        const res = await send('/response/no-content');

        expect(res.status).toBe(204);
        expect(res.headers['x-from-response']).toBe('yes');
        expect(res.headers['content-type']).toBeUndefined();
        expect(res.text).toBe('');
        expect(res.complete).toBe(true);
      });

      it('should send what Response.redirect() makes', async () => {
        const res = await send('/response/redirect');

        expect(res.status).toBe(307);
        expect(res.headers.location).toBe('http://localhost/elsewhere');
        expect(res.text).toBe('');
      });

      it('should send an empty body', async () => {
        const res = await send('/response/empty');

        expect(res.status).toBe(201);
        expect(res.text).toBe('');
        expect(res.complete).toBe(true);
      });

      it('should answer 500 for a body that was read already', async () => {
        const res = await send('/response/consumed');

        expect(res.status).toBe(500);
        expect(JSON.parse(res.text).message).toBe('Internal server error');
      });

      it('should answer 500 for a body that is locked', async () => {
        expect((await send('/response/locked')).status).toBe(500);
      });

      it('should answer 500 for Response.error()', async () => {
        expect((await send('/response/network-error')).status).toBe(500);
      });

      it("should win over @HttpCode() and @Header(), and leave the others' headers", async () => {
        const res = await send('/response/decorated');

        expect(res.status).toBe(202);
        expect(res.headers['x-shared']).toBe('response');
        expect(res.headers['content-type']).toMatch(/^text\/x-custom/);
        expect(res.headers['x-decorator']).toBe('kept');
        expect(res.headers['cache-control']).toBe('no-store');
        expect(res.headers['x-middleware']).toBe('ran');
        expect(res.headers['x-shared-with-middleware']).toBe('response');
      });

      it('should keep the Content-Type of @Header() when it has none', async () => {
        const res = await send('/response/content-type-from-decorator');

        expect(res.headers['content-type']).toMatch(/^text\/x-decorated/);
        expect(res.text).toBe('decorated');
      });

      it('should keep the headers a guard set', async () => {
        const res = await send('/response/guarded');

        expect(res.headers['x-guard']).toBe('ran');
        expect(res.headers['x-from-response']).toBe('yes');
      });

      it('should win over the default status of POST', async () => {
        const res = await send('/response/created', { method: 'POST' });

        expect(res.status).toBe(200);
        expect(res.text).toBe('created');
      });

      it('should go through the exception filters when it fails before the first chunk', async () => {
        const res = await send('/response/fail-first');

        expect(res.status).toBe(404);
        expect(JSON.parse(res.text).message).toBe('not there');
        expect(res.headers['x-from-response']).toBeUndefined();
      });

      it('should end the connection when it fails after the first chunk', async () => {
        const res = await send('/response/fail-later');

        expect(res.status).toBe(200);
        expect(res.text).toBe('partial');
        expect(res.complete).toBe(false);
      });

      it('should send what fetch() returns, with the body as it decoded it', async () => {
        const res = await send('/response/fetched');

        expect(res.status).toBe(200);
        expect(res.text).toBe('hello from upstream');
        expect(res.headers['content-type']).toMatch(/^text\/x-upstream/);
        expect(res.headers['x-upstream']).toBe('yes');
        expect(res.headers['content-encoding']).toBeUndefined();
        expect(res.headers['content-length']).toBeUndefined();
        expect(res.headers['keep-alive']).not.toBe('upstream');
      });

      it('should pass on the status of what fetch() returns', async () => {
        const res = await send('/response/fetched-missing');

        expect(res.status).toBe(404);
        expect(res.text).toBe('missing upstream');
      });

      it('should cancel the body when the client leaves before the first chunk', async () => {
        await sendAndLeave('/response/quiet', 'sent');

        await vi.waitFor(() => expect(streaming.stopped).toBe(1));
      });

      it('should cancel the body when the client leaves, even if it went quiet', async () => {
        await sendAndLeave('/response/endless', 'headers');

        await vi.waitFor(() => expect(streaming.stopped).toBe(1));
      });

      it('should answer HEAD with its headers, without reading the body', async () => {
        const res = await send('/response/sized', { method: 'HEAD' });

        expect(res.status).toBe(200);
        expect(res.headers['content-length']).toBe('5');
        expect(res.headers['content-type']).toMatch(/^text\/x-custom/);
        expect(res.text).toBe('');
        expect(res.complete).toBe(true);
        await vi.waitFor(() => expect(streaming.stopped).toBe(1));
      });
    });

    describe('a ReadableStream', () => {
      it('should send it', async () => {
        const res = await send('/web-stream');

        expect(res.status).toBe(200);
        expect(res.text).toBe('from a web stream');
        expect(res.headers['content-type']).toBe('application/octet-stream');
        expect(res.complete).toBe(true);
      });

      it('should send strings as text', async () => {
        const res = await send('/web-stream/strings');

        expect(res.text).toBe('from strings');
        expect(res.headers['content-type']).toMatch(/^text\/plain/);
      });

      it('should send objects as lines of JSON', async () => {
        const res = await send('/web-stream/objects');

        expect(res.text).toBe('{"n":1}\n{"n":2}\n');
        expect(res.headers['content-type']).toBe('application/x-ndjson');
      });

      it('should answer 500 for one that is locked or was read already', async () => {
        expect((await send('/web-stream/locked')).status).toBe(500);
        expect((await send('/web-stream/consumed')).status).toBe(500);
      });

      it('should go through the exception filters when it fails before the first chunk', async () => {
        const res = await send('/web-stream/fail-first');

        expect(res.status).toBe(500);
        expect(res.complete).toBe(true);
      });

      it('should end the connection when it fails after the first chunk', async () => {
        const res = await send('/web-stream/fail-later');

        expect(res.text).toBe('partial');
        expect(res.complete).toBe(false);
      });

      it('should cancel it when the client leaves before the first chunk', async () => {
        await sendAndLeave('/web-stream/quiet', 'sent');

        await vi.waitFor(() => expect(streaming.stopped).toBe(1));
      });

      it('should cancel it when the client leaves, even if it went quiet', async () => {
        await sendAndLeave('/web-stream/endless', 'headers');

        await vi.waitFor(() => expect(streaming.stopped).toBe(1));
        expect(streaming.storeWhenStopped).toBe('request');
      });

      it('should answer HEAD without reading it', async () => {
        const res = await send('/web-stream/endless', { method: 'HEAD' });

        expect(res.status).toBe(200);
        expect(res.text).toBe('');
        expect(res.complete).toBe(true);
        await vi.waitFor(() => expect(streaming.stopped).toBe(1));
      });
    });

    describe('an async generator', () => {
      it('should send what it yields as text', async () => {
        const res = await send('/generator');

        expect(res.status).toBe(200);
        expect(res.text).toBe('from a generator');
        expect(res.headers['content-type']).toBe('text/plain; charset=utf-8');
        expect(res.headers['transfer-encoding']).toBe('chunked');
        expect(res.complete).toBe(true);
      });

      it('should send binary chunks as they are', async () => {
        const res = await send('/generator/bytes');

        expect(res.text).toBe('from bytes and buffers');
        expect(res.headers['content-type']).toBe('application/octet-stream');
      });

      it('should send objects as lines of JSON', async () => {
        const res = await send('/generator/objects');

        expect(res.text).toBe('{"n":1}\n[2]\n3\nnull\nand text');
        expect(res.headers['content-type']).toBe('application/x-ndjson');
      });

      it('should send nothing for an empty one', async () => {
        const res = await send('/generator/empty');

        expect(res.status).toBe(200);
        expect(res.text).toBe('');
        expect(res.complete).toBe(true);
      });

      it('should send the headers early for an empty first chunk', async () => {
        const text = await new Promise<string>((resolve, reject) => {
          const req = get(`${baseUrl}/generator/flushed`, res => {
            // The generator only goes on once the headers are here
            streaming.openGate();
            let body = '';
            res.on('data', chunk => (body += chunk));
            res.on('end', () => resolve(body));
          });
          req.on('error', reject);
        });

        expect(text).toBe('later');
      });

      it('should apply @HttpCode() and @Header()', async () => {
        const res = await send('/generator/decorated');

        expect(res.status).toBe(203);
        expect(res.headers['content-type']).toMatch(/^text\/x-decorated/);
        expect(res.text).toBe('decorated');
      });

      it('should keep the default status of POST', async () => {
        const res = await send('/generator/created', { method: 'POST' });

        expect(res.status).toBe(201);
      });

      it('should iterate any other async iterable', async () => {
        expect((await send('/generator/iterable')).text).toBe('01');
      });

      it('should go through the exception filters when it fails before the first chunk', async () => {
        const res = await send('/generator/fail-first-http');

        expect(res.status).toBe(404);
        expect(JSON.parse(res.text).message).toBe('not there');
      });

      it('should reach the filters of the controller', async () => {
        const res = await send('/generator/fail-first-filtered');

        expect(res.status).toBe(418);
        expect(res.text).toBe('caught by the filter');
      });

      it('should not expose an unknown error', async () => {
        const res = await send('/generator/fail-first-unknown');

        expect(res.status).toBe(500);
        expect(res.text).not.toContain('private details');
      });

      it('should end the connection when it fails after the first chunk', async () => {
        const res = await send('/generator/fail-later');

        expect(res.status).toBe(200);
        expect(res.text).toBe('partial');
        expect(res.complete).toBe(false);
      });

      it('should end the connection when it fails right after the first chunk', async () => {
        const res = await send('/generator/fail-right-after-first');

        expect(res.status).toBe(200);
        expect(res.complete).toBe(false);
      });

      it('should answer 500 and stop it when the first chunk cannot be serialized', async () => {
        const res = await send('/generator/unserializable-first');

        expect(res.status).toBe(500);
        await vi.waitFor(() => expect(streaming.stopped).toBe(1));
      });

      it('should end the connection and stop it when a later chunk cannot be serialized', async () => {
        const res = await send('/generator/unserializable-later');

        expect(res.text).toBe('{"n":1}\n');
        expect(res.complete).toBe(false);
        await vi.waitFor(() => expect(streaming.stopped).toBe(1));
      });

      it('should call return() when the client leaves', async () => {
        await sendAndLeave('/generator/endless', 'headers');

        await vi.waitFor(() => expect(streaming.stopped).toBe(1));
      });

      it('should call return() when the client leaves before the first chunk', async () => {
        await sendAndLeave('/generator/slow-start', 'sent');

        await vi.waitFor(() => expect(streaming.stopped).toBe(1));
        expect(streaming.started).toBe(1);
        expect(streaming.pulled).toBe(0);
      });

      it('should not read ahead of a client that does not read', async () => {
        const { port } = new URL(baseUrl);
        const socket = connect(Number(port), '127.0.0.1');
        socket.on('error', () => undefined);
        socket.write(
          'GET /generator/big HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n',
        );
        socket.pause();

        // The socket buffers some of it, up to some MB. The rest has to wait.
        await vi.waitFor(() => expect(streaming.pulled).toBeGreaterThan(0));
        await new Promise(resolve => setTimeout(resolve, 300));
        const pulled = streaming.pulled;
        expect(pulled).toBeLessThan(32);
        await new Promise(resolve => setTimeout(resolve, 100));
        expect(streaming.pulled).toBe(pulled);

        socket.destroy();
        await vi.waitFor(() => expect(streaming.stopped).toBe(1));
        // return() is called when the socket closes, outside of the request
        expect(streaming.storeWhenStopped).toBe('request');
      });

      it('should keep the AsyncLocalStorage store of the request across reads', async () => {
        const res = await send('/generator/context');

        expect(res.text.split('\n').pop()).toBe('["request"]');
      });

      it('should not start it for HEAD', async () => {
        const res = await send('/generator', { method: 'HEAD' });

        expect(res.status).toBe(200);
        expect(res.text).toBe('');
        expect(res.complete).toBe(true);

        const declared = await send('/generator/head-only', { method: 'HEAD' });

        expect(declared.status).toBe(200);
        expect(streaming.started).toBe(0);
      });

      it('should leave the connection reusable after HEAD', async () => {
        const agent = new Agent({ keepAlive: true, maxSockets: 1 });

        await send('/generator/endless', { method: 'HEAD', agent });
        const res = await send('/generator', { agent });
        agent.destroy();

        expect(res.text).toBe('from a generator');
      });
    });

    describe('a Node.js Readable', () => {
      it('should send it', async () => {
        const res = await send('/node-stream');

        expect(res.status).toBe(200);
        expect(res.text).toBe('from a node stream');
        expect(res.headers['content-type']).toBe('text/plain; charset=utf-8');
      });

      it('should send bytes as binary', async () => {
        const res = await send('/node-stream/bytes');

        expect(res.text).toBe('from bytes');
        expect(res.headers['content-type']).toBe('application/octet-stream');
      });

      it('should send objects as lines of JSON', async () => {
        expect((await send('/node-stream/objects')).text).toBe(
          '{"n":1}\n{"n":2}\n',
        );
      });

      it('should answer 500 for one that was read already', async () => {
        expect((await send('/node-stream/read')).status).toBe(500);
      });

      it('should go through the exception filters when it fails before the first chunk', async () => {
        const res = await send('/node-stream/fail-first');

        expect(res.status).toBe(404);
      });

      it('should end the connection when it fails after the first chunk', async () => {
        const res = await send('/node-stream/fail-later');

        expect(res.text).toBe('partial');
        expect(res.complete).toBe(false);
      });

      it('should destroy it when the client leaves, even if it went quiet', async () => {
        await sendAndLeave('/node-stream/quiet', 'sent');

        await vi.waitFor(() => expect(streaming.stopped).toBe(1));
      });

      it('should survive failing while an interceptor awaits', async () => {
        const res = await send('/node-stream/fails-while-intercepted');

        expect(res.status).toBe(404);
      });

      describe('that cannot open the file it reads', () => {
        it('should go through the exception filters', async () => {
          expect((await send('/node-stream/missing-file')).status).toBe(500);
        });

        it.each([
          ['an Observable that completes later', 'observed'],
          [
            'an Observable the handler resolves to, while an interceptor awaits',
            'promised-observable',
          ],
        ])('should go through them for one of %s', async (_, path) => {
          const res = await send(`/node-stream/missing-file/${path}`);

          expect(res.status).toBe(500);
        });

        it.each(['missing-file', 'missing-file/promised-observable'])(
          'should answer HEAD for %s and keep serving',
          async path => {
            const res = await send(`/node-stream/${path}`, { method: 'HEAD' });
            // The failure is reported once the stream has been stopped
            await new Promise(resolve => setTimeout(resolve, 20));

            expect(res.status).toBe(200);
            expect((await send('/node-stream/missing-file')).status).toBe(500);
          },
        );

        it('should keep serving when the client leaves before the handler returns it', async () => {
          const req = get(`${baseUrl}/node-stream/missing-file/gated`);
          req.on('error', () => undefined);
          await vi.waitFor(() => expect(streaming.started).toBe(1));
          req.destroy();
          await new Promise(resolve => setTimeout(resolve, 20));
          streaming.openGate();
          await new Promise(resolve => setTimeout(resolve, 20));

          expect((await send('/node-stream/missing-file')).status).toBe(500);
        });
      });
    });

    describe('with interceptors', () => {
      it.each([
        ['wrapped/generator', 'from a generator'],
        ['wrapped/web-stream', 'from a web stream'],
        ['wrapped/response', 'from a response'],
        ['wrapped/promised-response', 'promised'],
        ['wrapped/observable-response', 'observed'],
        ['wrapped/node-stream', 'from a node stream'],
        ['plain-serialized/generator', 'from a generator'],
        ['plain-serialized/response', 'from a response'],
        ['class-serialized/generator', 'from a generator'],
        ['class-serialized/response', 'from a response'],
        ['class-serialized/node-stream', 'from a node stream'],
        ['tapped', 'tapped'],
      ])('should send the stream of %s', async (path, expected) => {
        const res = await send(`/intercepted/${path}`);

        expect(res.text).toBe(expected);
        expect(res.complete).toBe(true);
      });

      it('should keep the status and headers of a Response an interceptor wrapped', async () => {
        const res = await send('/intercepted/wrapped/response');

        expect(res.status).toBe(202);
        expect(res.headers['x-from-response']).toBe('yes');
      });

      it('should still wrap what is not a stream', async () => {
        expect((await send('/intercepted/wrapped/json')).text).toBe(
          '{"data":{"n":1}}',
        );
      });

      it('should send the stream an interceptor replaced it with', async () => {
        expect((await send('/intercepted/piped')).text).toBe('PIPED');
      });

      it('should send what an interceptor made of a stream it read', async () => {
        expect((await send('/intercepted/collected/generator')).text).toBe(
          '{"collected":"from a generator"}',
        );
        expect((await send('/intercepted/collected/web-stream')).text).toBe(
          '{"collected":"from a web stream"}',
        );
      });

      it('should send the file an interceptor replaced it with', async () => {
        const res = await send('/intercepted/file');

        expect(res.headers['content-type']).toMatch(/^text\/csv/);
        expect(res.text).toBe('a,b');
      });

      it('should go through the exception filters when an interceptor throws', async () => {
        const res = await send('/intercepted/rejected');

        expect(res.status).toBe(400);
        expect(JSON.parse(res.text).message).toBe(
          'rejected by the interceptor',
        );
        await vi.waitFor(() => expect(streaming.stopped).toBe(1));
      });

      it('should send what an interceptor made of an empty stream', async () => {
        expect((await send('/intercepted/wrapped/empty')).text).toBe(
          '{"data":{}}',
        );
      });

      it('should call return() on the stream of a wrapped body when the client leaves', async () => {
        await sendAndLeave('/intercepted/wrapped/endless', 'headers');

        await vi.waitFor(() => expect(streaming.stopped).toBe(1));
      });
    });

    describe('with @Res()', () => {
      it('should leave what the handler returns alone', async () => {
        const res = await send('/manual/res');

        expect(res.text).toBe('sent by hand');
        expect(streaming.started).toBe(1);
        expect(streaming.stopped).toBe(0);
      });

      it('should stream with @Res({ passthrough: true })', async () => {
        const res = await send('/manual/passthrough');

        expect(res.text).toBe('passed through');
        expect(res.headers['x-by-hand']).toBe('yes');
      });
    });

    describe('values that are not streams', () => {
      it.each([
        ['array', '[1,2]'],
        ['set', '{}'],
        ['sync-iterable', '{"name":"iterable"}'],
        ['thenable', '{"docs":[1,2]}'],
        ['thenable-intercepted', '{"data":{"docs":[1,2]}}'],
        ['observable', '3'],
        ['observable-of-thenable', '{"docs":[1],"then":"not a function"}'],
        ['from-generator', '2'],
      ])('should keep serializing %s', async (path, expected) => {
        const res = await send(`/compatible/${path}`);

        expect(res.status).toBe(200);
        expect(res.text).toBe(expected);
      });
    });
  },
);
