import {
  BadRequestException,
  HttpException,
  InternalServerErrorException,
  type NestApplicationOptions,
  RequestMethod,
  StreamableFile,
  VERSION_NEUTRAL,
  type VersioningOptions,
  VersioningType,
} from '@nestjs/common';
import { LegacyRouteConverter } from '@nestjs/core/internal';
import {
  NodeAdapter,
  NodeRequest,
  NodeResponse,
  NodeRouter,
} from '@nestjs/platform-node';
import { once } from 'events';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import * as http from 'http';
import * as https from 'https';
import type { AddressInfo } from 'net';
import { tmpdir } from 'os';
import { join } from 'path';
import { PassThrough, Readable } from 'stream';

type StreamableHandlerResponse = Parameters<StreamableFile['errorHandler']>[1];
type Next = (err?: unknown) => void;

// A throwaway self-signed certificate (CN=localhost), shared with the TLS
// tests of the microservices package
const key = readFileSync(
  new URL(
    '../../../../integration/microservices/src/tcp-tls/privkey.pem',
    import.meta.url,
  ),
);
const cert = readFileSync(
  new URL(
    '../../../../integration/microservices/src/tcp-tls/ca.cert.pem',
    import.meta.url,
  ),
);

interface TestResponse {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
  text: string;
}

interface TestRequestOptions {
  method?: string;
  path?: string;
  headers?: http.OutgoingHttpHeaders;
  body?: string | Buffer;
  agent?: http.Agent | false;
}

/**
 * Sends a request to the IPv4 loopback. Unlike "fetch()", the path is sent
 * as is (no "../" resolution), and the raw response headers are returned.
 * Each request opens its own connection, closed after the response.
 */
function request(
  port: number,
  options: TestRequestOptions = {},
): Promise<TestResponse> {
  const { method = 'GET', path = '/', headers, body, agent = false } = options;
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port, method, path, headers, agent },
      res => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve({
            status: res.statusCode!,
            headers: res.headers,
            body: buffer,
            text: buffer.toString(),
          });
        });
        res.on('error', reject);
      },
    );
    req.on('error', reject);
    req.end(body);
  });
}

describe('NodeAdapter', () => {
  let adapter: NodeAdapter;

  const startServer = async (options: NestApplicationOptions = {}) => {
    adapter.initHttpServer(options);
    await new Promise<void>(resolve =>
      adapter.listen(0, '127.0.0.1', () => resolve()),
    );
    return (adapter.getHttpServer().address() as AddressInfo).port;
  };

  beforeEach(() => {
    adapter = new NodeAdapter();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    adapter.getHttpServer()?.closeAllConnections();
    await adapter.close();
  });

  describe('getType', () => {
    it('should return "node"', () => {
      expect(adapter.getType()).toBe('node');
    });
  });

  describe('isRouteOrderSensitive', () => {
    it('should return false, as routes are matched by specificity', async () => {
      expect(adapter.isRouteOrderSensitive()).toBe(false);

      const port = await startServer();
      adapter.get('/users/:id', (req: NodeRequest, res: NodeResponse) =>
        adapter.reply(res, 'by id'),
      );
      adapter.get('/users/me', (req: NodeRequest, res: NodeResponse) =>
        adapter.reply(res, 'me'),
      );

      expect((await request(port, { path: '/users/me' })).text).toBe('me');
      expect((await request(port, { path: '/users/1' })).text).toBe('by id');
    });
  });

  describe('getInstance', () => {
    it('should return the router, a callable request listener', async () => {
      const router = adapter.getInstance<NodeRouter>();
      expect(router).toBeInstanceOf(NodeRouter);
      expect(typeof router).toBe('function');

      adapter.get('/', (req: NodeRequest, res: NodeResponse) =>
        adapter.reply(res, 'from the router'),
      );
      const server = http.createServer(router);
      await new Promise<void>(resolve =>
        server.listen(0, '127.0.0.1', resolve),
      );
      try {
        const res = await request((server.address() as AddressInfo).port);
        expect(res.text).toBe('from the router');
      } finally {
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
      }
    });

    it('should return the router given to the constructor', () => {
      const router = new NodeRouter(() => {});

      expect(new NodeAdapter(router).getInstance()).toBe(router);
    });
  });

  describe('reply', () => {
    let port: number;

    beforeEach(async () => {
      port = await startServer();
    });

    const replyWith = (
      body: unknown,
      statusCode?: number,
      prepare?: (res: NodeResponse) => void,
      requestOptions: TestRequestOptions = {},
    ) => {
      adapter.get('/', (req: NodeRequest, res: NodeResponse) => {
        prepare?.(res);
        adapter.reply(res, body, statusCode);
      });
      return request(port, requestOptions);
    };

    it('should send an object as JSON, with its exact byte length', async () => {
      const body = { name: 'zażółć gęślą jaźń', tags: ['ü', 'ß'] };
      const json = JSON.stringify(body);

      const res = await replyWith(body);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe(
        'application/json; charset=utf-8',
      );
      expect(res.headers['content-length']).toBe(
        String(Buffer.byteLength(json)),
      );
      expect(JSON.parse(res.text)).toEqual(body);
    });

    it('should send an array as JSON', async () => {
      const res = await replyWith([1, 'two', { three: 3 }]);

      expect(res.headers['content-type']).toBe(
        'application/json; charset=utf-8',
      );
      expect(JSON.parse(res.text)).toEqual([1, 'two', { three: 3 }]);
    });

    it('should send a string as plain text, with its exact byte length', async () => {
      const body = 'Witaj, świecie! 👋';

      const res = await replyWith(body);

      expect(res.headers['content-type']).toBe('text/plain; charset=utf-8');
      expect(res.headers['content-length']).toBe(
        String(Buffer.byteLength(body)),
      );
      expect(res.text).toBe(body);
    });

    it.each([
      [42, '42'],
      [false, 'false'],
    ])('should send the primitive %j as text', async (body, expected) => {
      const res = await replyWith(body);

      expect(res.headers['content-type']).toBe('text/plain; charset=utf-8');
      expect(res.text).toBe(expected);
    });

    it.each([
      ['a Buffer', Buffer.from([0x00, 0xff, 0x10, 0x80])],
      ['a Uint8Array', new Uint8Array([0x00, 0xff, 0x10, 0x80])],
    ])('should send %s as binary data', async (_, body) => {
      const res = await replyWith(body);

      expect(res.headers['content-type']).toBe('application/octet-stream');
      expect(res.headers['content-length']).toBe('4');
      expect(res.body).toEqual(Buffer.from([0x00, 0xff, 0x10, 0x80]));
    });

    it.each([undefined, null])(
      'should send an empty response when the body is %s',
      async body => {
        const res = await replyWith(body);

        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toBeUndefined();
        expect(res.body).toHaveLength(0);
      },
    );

    it('should apply the given status code', async () => {
      const res = await replyWith({ created: true }, 201);

      expect(res.status).toBe(201);
      expect(JSON.parse(res.text)).toEqual({ created: true });
    });

    it('should keep the status code set earlier when none is given', async () => {
      const res = await replyWith('accepted', undefined, response => {
        response.statusCode = 202;
      });

      expect(res.status).toBe(202);
    });

    it('should apply falsy status codes instead of dropping them', () => {
      // "0" and "NaN" are falsy, but they were still passed in. Forwarding them
      // lets Node.js reject the value, whereas skipping them would send the
      // body with the status set before the handler ran (200/201).
      for (const statusCode of [0, NaN]) {
        const response = { statusCode: 200, end: vi.fn() };

        adapter.reply(response as any, undefined, statusCode);

        expect(response.statusCode).toBe(statusCode);
      }
    });

    it.each([
      ['a string', '<p>zażółć</p>', 'text/html; charset=utf-8'],
      ['an object', { data: [] }, 'application/vnd.api+json'],
      ['a Buffer', Buffer.from('%PDF-1.7'), 'application/pdf'],
    ])(
      'should keep the Content-Type set by the handler for %s',
      async (_, body, contentType) => {
        const payload = Buffer.isBuffer(body)
          ? body
          : typeof body === 'string'
            ? body
            : JSON.stringify(body);

        const res = await replyWith(body, undefined, response =>
          response.setHeader('Content-Type', contentType),
        );

        expect(res.headers['content-type']).toBe(contentType);
        expect(res.headers['content-length']).toBe(
          String(Buffer.byteLength(payload)),
        );
      },
    );

    it('should send an error body as JSON when the Content-Type is not JSON, and warn', async () => {
      const warn = vi
        .spyOn((adapter as any).logger, 'warn')
        .mockImplementation(() => {});
      const body = { statusCode: 400, message: 'Oops' };

      const res = await replyWith(body, 400, response =>
        response.setHeader('Content-Type', 'text/html'),
      );

      expect(res.status).toBe(400);
      expect(res.headers['content-type']).toBe('application/json');
      expect(JSON.parse(res.text)).toEqual(body);
      expect(warn).toHaveBeenCalledOnce();
    });

    it.each([
      'application/json; charset=utf-8',
      'application/problem+json',
      'application/vnd.api+json; charset=utf-8',
      'Application/JSON',
    ])(
      'should keep the "%s" JSON Content-Type for error bodies',
      async contentType => {
        const warn = vi
          .spyOn((adapter as any).logger, 'warn')
          .mockImplementation(() => {});

        const res = await replyWith(
          { statusCode: 400, message: 'Oops' },
          400,
          response => response.setHeader('Content-Type', contentType),
        );

        expect(res.headers['content-type']).toBe(contentType);
        expect(warn).not.toHaveBeenCalled();
      },
    );

    it('should send the Content-Length but no body in answer to HEAD requests', async () => {
      const body = { hello: 'świat' };

      const res = await replyWith(body, undefined, undefined, {
        method: 'HEAD',
      });

      expect(res.status).toBe(200);
      expect(res.headers['content-length']).toBe(
        String(Buffer.byteLength(JSON.stringify(body))),
      );
      expect(res.body).toHaveLength(0);
    });

    it.each([204, 304])(
      'should send a %i response with no body, Content-Type or Content-Length',
      async statusCode => {
        const res = await replyWith(
          { message: 'ignored' },
          statusCode,
          response => response.setHeader('Content-Type', 'application/json'),
        );

        expect(res.status).toBe(statusCode);
        expect(res.headers['content-type']).toBeUndefined();
        expect(res.headers['content-length']).toBeUndefined();
        expect(res.headers['transfer-encoding']).toBeUndefined();
        expect(res.body).toHaveLength(0);
      },
    );

    it.each([204, 205, 304])(
      'should send a %i response without a body and without the Content-Type set before',
      async statusCode => {
        const res = await replyWith(undefined, statusCode, response =>
          response.setHeader('Content-Type', 'application/json'),
        );

        expect(res.status).toBe(statusCode);
        expect(res.headers['content-type']).toBeUndefined();
        expect(res.body).toHaveLength(0);
      },
    );

    it('should send a 205 response with no body or Content-Type, and a zero Content-Length', async () => {
      const res = await replyWith({ message: 'ignored' }, 205, response =>
        response.setHeader('Content-Type', 'application/json'),
      );

      expect(res.status).toBe(205);
      expect(res.headers['content-type']).toBeUndefined();
      expect(res.headers['content-length']).toBe('0');
      expect(res.body).toHaveLength(0);
    });

    describe('when the body is a StreamableFile', () => {
      it('should pipe the stream, with the headers given by its options', async () => {
        const file = new StreamableFile(Readable.from(['a,b\n', '1,2\n']), {
          type: 'text/csv',
          disposition: 'attachment; filename="data.csv"',
          length: 8,
        });

        const res = await replyWith(file);

        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toBe('text/csv');
        expect(res.headers['content-disposition']).toBe(
          'attachment; filename="data.csv"',
        );
        expect(res.headers['content-length']).toBe('8');
        expect(res.text).toBe('a,b\n1,2\n');
      });

      it('should send a buffer as an octet stream of its length by default', async () => {
        const buffer = Buffer.from('zażółć');

        const res = await replyWith(new StreamableFile(buffer));

        expect(res.headers['content-type']).toBe('application/octet-stream');
        expect(res.headers['content-length']).toBe(String(buffer.length));
        expect(res.body).toEqual(buffer);
      });

      it('should keep the headers set by the handler', async () => {
        const file = new StreamableFile(Buffer.from('hello'), {
          type: 'application/pdf',
          disposition: 'inline',
        });

        const res = await replyWith(file, undefined, response => {
          response.setHeader('Content-Type', 'text/plain');
          response.setHeader('Content-Disposition', 'attachment');
        });

        expect(res.headers['content-type']).toBe('text/plain');
        expect(res.headers['content-disposition']).toBe('attachment');
        expect(res.text).toBe('hello');
      });

      it('should hand a stream error to the error handler of the StreamableFile', async () => {
        const error = new Error('read failed');
        const errorHandler = vi.fn(
          (err: Error, response: StreamableHandlerResponse) => {
            response.statusCode = 503;
            response.send(`custom: ${err.message}`);
          },
        );
        const source = new Readable({
          read() {
            this.destroy(error);
          },
        });

        const res = await replyWith(
          new StreamableFile(source).setErrorHandler(errorHandler),
        );

        expect(errorHandler).toHaveBeenCalledExactlyOnceWith(
          error,
          expect.anything(),
        );
        expect(res.status).toBe(503);
        expect(res.text).toBe('custom: read failed');
      });

      it('should answer a stream error with a 400 by default', async () => {
        const source = new Readable({
          read() {
            this.destroy(new Error('read failed'));
          },
        });

        const res = await replyWith(new StreamableFile(source));

        expect(res.status).toBe(400);
        expect(res.headers['content-type']).toBe('text/plain; charset=utf-8');
        expect(res.text).toBe('read failed');
      });

      it('should send the length of the error message, not of the file', async () => {
        const source = new Readable({
          read() {
            this.destroy(new Error('read failed'));
          },
        });

        const res = await replyWith(
          new StreamableFile(source, { length: 100 }),
        );

        expect(res.status).toBe(400);
        expect(res.headers['content-length']).toBe(
          String('read failed'.length),
        );
        expect(res.text).toBe('read failed');
      });

      it('should destroy the source stream when the client disconnects early', async () => {
        const source = new PassThrough();
        const errorHandler = vi.fn();
        let replied!: () => void;
        const handled = new Promise<void>(resolve => (replied = resolve));
        adapter.get('/', (req: NodeRequest, res: NodeResponse) => {
          adapter.reply(
            res,
            new StreamableFile(source)
              .setErrorHandler(errorHandler)
              .setErrorLogger(() => {}),
          );
          replied();
        });
        const clientRequest = http.request({
          host: '127.0.0.1',
          port,
          path: '/',
          agent: false,
        });
        clientRequest.on('error', () => {});
        clientRequest.end();

        await handled;
        source.write('partial');
        const [response] = await once(clientRequest, 'response');
        await once(response, 'data');
        clientRequest.destroy();

        await vi.waitFor(() => expect(source.destroyed).toBe(true));
        expect(source.readableEnded).toBe(false);
        expect(errorHandler).not.toHaveBeenCalled();
      });

      it('should destroy the source stream when the client disconnected before the reply', async () => {
        const source = new PassThrough();
        const errorHandler = vi.fn();
        let replied!: () => void;
        const handled = new Promise<void>(resolve => (replied = resolve));
        const clientRequest = http.request({
          host: '127.0.0.1',
          port,
          path: '/',
          agent: false,
        });
        adapter.get('/', async (req: NodeRequest, res: NodeResponse) => {
          clientRequest.destroy();
          // "close" has already fired when reply() runs
          await once(res, 'close');
          adapter.reply(
            res,
            new StreamableFile(source)
              .setErrorHandler(errorHandler)
              .setErrorLogger(() => {}),
          );
          replied();
        });
        clientRequest.on('error', () => {});
        clientRequest.end();

        await handled;

        await vi.waitFor(() => expect(source.destroyed).toBe(true));
        expect(errorHandler).not.toHaveBeenCalled();
      });

      it('should not destroy a source that has ended', async () => {
        const source = new PassThrough({ autoDestroy: false });
        let closed!: Promise<unknown>;
        adapter.get('/', (req: NodeRequest, res: NodeResponse) => {
          closed = once(res, 'close');
          adapter.reply(res, new StreamableFile(source));
          source.end('done');
        });

        const res = await request(port);
        await closed;
        await new Promise(resolve => setImmediate(resolve));

        expect(res.text).toBe('done');
        expect(source.readableEnded).toBe(true);
        expect(source.destroyed).toBe(false);
      });
    });
  });

  describe('status', () => {
    it('should set the status code and return the response', async () => {
      const port = await startServer();
      adapter.get('/', (req: NodeRequest, res: NodeResponse) => {
        const returned = adapter.status(res, 418);
        res.end(String(returned === res));
      });

      const res = await request(port);

      expect(res.status).toBe(418);
      expect(res.text).toBe('true');
    });
  });

  describe('redirect', () => {
    let port: number;

    beforeEach(async () => {
      port = await startServer();
    });

    const redirectTo = (statusCode: number, url: string) => {
      adapter.get('/', (req: NodeRequest, res: NodeResponse) =>
        adapter.redirect(res, statusCode, url),
      );
      return request(port);
    };

    it.each([301, 302, 307])(
      'should send a %i with the Location header and no body',
      async statusCode => {
        const res = await redirectTo(statusCode, '/login?next=%2Fhome');

        expect(res.status).toBe(statusCode);
        expect(res.headers.location).toBe('/login?next=%2Fhome');
        expect(res.body).toHaveLength(0);
      },
    );

    it('should percent-encode the Location without encoding it twice', async () => {
      const res = await redirectTo(302, '/a b/zażółć?q=ä&done=100%25');

      expect(res.headers.location).toBe(
        '/a%20b/za%C5%BC%C3%B3%C5%82%C4%87?q=%C3%A4&done=100%25',
      );
    });

    it('should encode CR and LF, so a URL cannot inject response headers', async () => {
      const res = await redirectTo(
        302,
        'https://example.com/\r\nSet-Cookie: session=stolen',
      );

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe(
        'https://example.com/%0D%0ASet-Cookie:%20session=stolen',
      );
      expect(res.headers['set-cookie']).toBeUndefined();
    });
  });

  describe('setHeader / getHeader / appendHeader', () => {
    let port: number;

    beforeEach(async () => {
      port = await startServer();
    });

    const run = async (handler: (res: NodeResponse) => unknown) => {
      adapter.get('/', (req: NodeRequest, res: NodeResponse) =>
        adapter.reply(res, { got: handler(res) ?? null }),
      );
      const res = await request(port);
      return { res, got: JSON.parse(res.text).got };
    };

    it('should set a header, and read it back case-insensitively', async () => {
      const { res, got } = await run(response => {
        adapter.setHeader(response, 'X-Custom', 'one');
        return adapter.getHeader(response, 'x-custom');
      });

      expect(got).toBe('one');
      expect(res.headers['x-custom']).toBe('one');
    });

    it('should replace a header that was set before', async () => {
      const { res } = await run(response => {
        adapter.setHeader(response, 'x-custom', 'one');
        adapter.setHeader(response, 'x-custom', 'two');
      });

      expect(res.headers['x-custom']).toBe('two');
    });

    it('should append to an existing header instead of overwriting it', async () => {
      const { got } = await run(response => {
        adapter.appendHeader(response, 'x-a', '1');
        adapter.appendHeader(response, 'x-a', '2');
        adapter.appendHeader(response, 'x-a', '3');
        return adapter.getHeader(response, 'x-a');
      });

      expect(got).toEqual(['1', '2', '3']);
    });

    it('should append after setHeader, whatever the case of the name', async () => {
      const { got } = await run(response => {
        adapter.setHeader(response, 'X-A', '1');
        adapter.appendHeader(response, 'x-a', '2');
        return adapter.getHeader(response, 'X-A');
      });

      expect(got).toEqual(['1', '2']);
    });

    it('should send every appended Set-Cookie value', async () => {
      const { res } = await run(response => {
        adapter.appendHeader(response, 'Set-Cookie', 'a=1');
        adapter.appendHeader(response, 'Set-Cookie', 'b=2');
      });

      expect(res.headers['set-cookie']).toEqual(['a=1', 'b=2']);
    });
  });

  describe('isHeadersSent', () => {
    it('should tell whether the headers have been sent', async () => {
      const port = await startServer();
      const states: boolean[] = [];
      adapter.get('/', (req: NodeRequest, res: NodeResponse) => {
        states.push(adapter.isHeadersSent(res));
        res.writeHead(200);
        states.push(adapter.isHeadersSent(res));
        res.end();
      });

      await request(port);

      expect(states).toEqual([false, true]);
    });
  });

  describe('getRequestHostname / getRequestMethod / getRequestUrl', () => {
    let port: number;

    beforeEach(async () => {
      port = await startServer();
    });

    it('should return the host name without the port', async () => {
      adapter.get('/', (req: NodeRequest, res: NodeResponse) =>
        adapter.reply(res, adapter.getRequestHostname(req)),
      );

      const res = await request(port, {
        headers: { host: 'api.example.test:8080' },
      });

      expect(res.text).toBe('api.example.test');
    });

    it('should return the request method', async () => {
      adapter.all('/', (req: NodeRequest, res: NodeResponse) =>
        adapter.reply(res, adapter.getRequestMethod(req)),
      );

      expect((await request(port, { method: 'PATCH' })).text).toBe('PATCH');
      expect((await request(port, { method: 'GET' })).text).toBe('GET');
    });

    it('should return the original URL with its query string, also in a mounted middleware', async () => {
      adapter.use('/api', (req: NodeRequest, res: NodeResponse) =>
        adapter.reply(res, { url: adapter.getRequestUrl(req), raw: req.url }),
      );

      const res = await request(port, { path: '/api/users?page=2' });

      expect(JSON.parse(res.text)).toEqual({
        url: '/api/users?page=2',
        raw: '/users?page=2',
      });
    });
  });

  describe('end', () => {
    let port: number;

    beforeEach(async () => {
      port = await startServer();
    });

    it('should end the response with the given message', async () => {
      adapter.get('/', (req: NodeRequest, res: NodeResponse) =>
        adapter.end(res, 'bye'),
      );

      const res = await request(port);

      expect(res.status).toBe(200);
      expect(res.text).toBe('bye');
    });

    it('should end the response without a body', async () => {
      adapter.get('/', (req: NodeRequest, res: NodeResponse) =>
        adapter.end(res),
      );

      const res = await request(port);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });
  });

  describe('render / setViewEngine / setBaseViewsDir', () => {
    let viewsDir: string;
    const fakeEngine = {
      __express: (
        file: string,
        data: Record<string, any>,
        callback: (err: unknown, html?: string) => void,
      ) =>
        callback(
          null,
          readFileSync(file, 'utf8').replace('{{name}}', data.name),
        ),
    };

    beforeAll(() => {
      viewsDir = mkdtempSync(join(tmpdir(), 'nest-node-adapter-views-'));
      writeFileSync(join(viewsDir, 'index.fake'), '<h1>Hello {{name}}</h1>');
    });

    afterAll(() => rmSync(viewsDir, { recursive: true, force: true }));

    const renderIndex = async () => {
      const port = await startServer();
      adapter.get('/', async (req: NodeRequest, res: NodeResponse) => {
        await adapter.render(res, 'index', { name: 'Zażółć' });
      });
      return request(port);
    };

    it('should render the view with the configured engine, as HTML', async () => {
      adapter.setViewEngine({ engine: { fake: fakeEngine }, root: viewsDir });

      const res = await renderIndex();

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('text/html; charset=utf-8');
      expect(res.text).toBe('<h1>Hello Zażółć</h1>');
      expect(res.headers['content-length']).toBe(
        String(Buffer.byteLength('<h1>Hello Zażółć</h1>')),
      );
    });

    it('should look views up in the directory set with setBaseViewsDir()', async () => {
      const returned = adapter
        .setViewEngine({ engine: { fake: fakeEngine } })
        .setBaseViewsDir(viewsDir);

      const res = await renderIndex();

      expect(returned).toBe(adapter);
      expect(res.text).toBe('<h1>Hello Zażółć</h1>');
    });

    it('should reject when no view engine is configured', async () => {
      await expect(
        adapter.render({} as NodeResponse, 'index', {}),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });

  describe('setErrorHandler', () => {
    it.each([undefined, '', 'api', '/api/'])(
      'should handle the errors of routes inside and outside of the prefix %j',
      async prefix => {
        const port = await startServer();
        adapter.get('/api/fail', () => {
          throw new Error('inside');
        });
        adapter.get('/fail', () => {
          throw new Error('outside');
        });
        adapter.setErrorHandler(
          (err: Error, req: NodeRequest, res: NodeResponse, next: Next) =>
            adapter.reply(res, `handled: ${err.message}`, 500),
          prefix,
        );

        expect((await request(port, { path: '/api/fail' })).text).toBe(
          'handled: inside',
        );
        expect((await request(port, { path: '/fail' })).text).toBe(
          'handled: outside',
        );
      },
    );
  });

  describe('setNotFoundHandler', () => {
    let port: number;
    let handledBy: string[];

    beforeEach(async () => {
      port = await startServer();
      handledBy = [];
    });

    const notFoundHandler =
      (name: string) => (req: NodeRequest, res: NodeResponse) => {
        handledBy.push(`${name} ${req.method} ${adapter.getRequestUrl(req)}`);
        adapter.reply(res, { handledBy: name }, 404);
      };

    const routeTo = (path: string) =>
      adapter.get(path, (req: NodeRequest, res: NodeResponse) =>
        adapter.reply(res, `route ${path}`),
      );

    it.each([undefined, '', '/'])(
      'should handle every unmatched request for prefix %j',
      async prefix => {
        routeTo('/hello');
        adapter.setNotFoundHandler(notFoundHandler('root'), prefix);

        expect((await request(port, { path: '/hello' })).text).toBe(
          'route /hello',
        );
        const res = await request(port, { path: '/missing?x=1' });

        expect(res.status).toBe(404);
        expect(JSON.parse(res.text)).toEqual({ handledBy: 'root' });
        await request(port, { method: 'POST', path: '/' });
        expect(handledBy).toEqual(['root GET /missing?x=1', 'root POST /']);
      },
    );

    it.each(['api', '/api', 'api/', '/api/'])(
      'should handle only the unmatched requests under the prefix %s',
      async prefix => {
        routeTo('/api/hello');
        adapter.setNotFoundHandler(notFoundHandler('api'), prefix);

        expect((await request(port, { path: '/api/hello' })).text).toBe(
          'route /api/hello',
        );
        for (const path of ['/api', '/api/', '/api/missing']) {
          expect((await request(port, { path })).status).toBe(404);
        }
        // Not under the prefix: left to the default handler
        for (const path of ['/missing', '/apiary']) {
          expect((await request(port, { path })).status).toBe(404);
        }
        expect(handledBy).toEqual([
          'api GET /api',
          'api GET /api/',
          'api GET /api/missing',
        ]);
      },
    );

    it('should handle method misses on the excluded routes, whatever method the exclusion names', async () => {
      // Excluded routes live at the root, out of the prefix mount's reach
      routeTo('/hello');
      routeTo('/health/live');
      adapter.setNotFoundHandler(notFoundHandler('api'), 'api', [
        { path: 'hello', method: RequestMethod.GET },
        { path: '/health/{*path}', method: RequestMethod.ALL },
      ]);

      expect((await request(port, { path: '/hello' })).text).toBe(
        'route /hello',
      );
      expect((await request(port, { path: '/health/live' })).text).toBe(
        'route /health/live',
      );
      expect(
        (await request(port, { method: 'POST', path: '/hello' })).status,
      ).toBe(404);
      expect(
        (await request(port, { method: 'DELETE', path: '/health/live' }))
          .status,
      ).toBe(404);
      expect(handledBy).toEqual(['api POST /hello', 'api DELETE /health/live']);
    });

    it('should leave the requests under the prefix of another application sharing the adapter to that application', async () => {
      // A root application, then a prefixed one, both on the same adapter
      routeTo('/hello');
      adapter.setNotFoundHandler(notFoundHandler('root'));
      routeTo('/api/hello');
      adapter.setNotFoundHandler(notFoundHandler('api'), 'api');

      expect((await request(port, { path: '/hello' })).text).toBe(
        'route /hello',
      );
      expect((await request(port, { path: '/api/hello' })).text).toBe(
        'route /api/hello',
      );
      for (const path of ['/api', '/api/missing', '/apiary', '/missing']) {
        expect((await request(port, { path })).status).toBe(404);
      }
      expect(handledBy).toEqual([
        'api GET /api',
        'api GET /api/missing',
        'root GET /apiary',
        'root GET /missing',
      ]);
    });
  });

  describe('registerParserMiddleware', () => {
    const parserNames = (useSpy: { mock: { calls: any[][] } }) =>
      useSpy.mock.calls.map(([parser]) => parser.name);

    it('should register the json and urlencoded parsers', () => {
      const useSpy = vi.spyOn(adapter.getInstance(), 'use');

      adapter.registerParserMiddleware();

      expect(parserNames(useSpy)).toEqual(['jsonParser', 'urlencodedParser']);
    });

    it('should register them only once', () => {
      adapter.registerParserMiddleware();
      const useSpy = vi.spyOn(adapter.getInstance(), 'use');

      adapter.registerParserMiddleware(undefined, true);

      expect(useSpy).not.toHaveBeenCalled();
    });

    it('should not register a default parser over one registered through useBodyParser()', () => {
      adapter.useBodyParser('json', false, { limit: '1mb' });
      const useSpy = vi.spyOn(adapter.getInstance(), 'use');

      adapter.registerParserMiddleware();

      expect(parserNames(useSpy)).toEqual(['urlencodedParser']);
    });

    describe('when parsing requests', () => {
      let port: number;

      const echo = () =>
        adapter.post('/', (req: NodeRequest, res: NodeResponse) =>
          adapter.reply(res, {
            body: req.body,
            rawBody: req.rawBody?.toString('base64') ?? null,
          }),
        );
      const post = (contentType: string, body: string | Buffer) =>
        request(port, {
          method: 'POST',
          headers: { 'content-type': contentType },
          body,
        }).then(res => JSON.parse(res.text));

      beforeEach(async () => {
        port = await startServer();
      });

      it('should parse json and extended urlencoded bodies', async () => {
        adapter.registerParserMiddleware();
        echo();

        expect(
          await post('application/json', '{"name":"Kamil","langs":["pl"]}'),
        ).toEqual({ body: { name: 'Kamil', langs: ['pl'] }, rawBody: null });
        expect(
          await post(
            'application/x-www-form-urlencoded',
            'user[name]=Kamil&user[langs][]=pl&user[langs][]=en',
          ),
        ).toEqual({
          body: { user: { name: 'Kamil', langs: ['pl', 'en'] } },
          rawBody: null,
        });
      });

      it('should expose the exact bytes of the body as req.rawBody when rawBody is true', async () => {
        adapter.registerParserMiddleware(undefined, true);
        echo();
        const json = Buffer.from('{ "name" : "zażółć" }\r\n');
        const form = Buffer.from('name=za%C5%BC%C3%B3%C5%82%C4%87&x=1+2');

        const jsonResult = await post('application/json', json);
        const formResult = await post(
          'application/x-www-form-urlencoded',
          form,
        );

        expect(jsonResult.body).toEqual({ name: 'zażółć' });
        expect(Buffer.from(jsonResult.rawBody, 'base64')).toEqual(json);
        expect(formResult.body).toEqual({ name: 'zażółć', x: '1 2' });
        expect(Buffer.from(formResult.rawBody, 'base64')).toEqual(form);
      });
    });
  });

  describe('useBodyParser', () => {
    let port: number;

    beforeEach(async () => {
      port = await startServer();
    });

    // Registered after the parser, which has to run first
    const echo = () =>
      adapter.post('/', (req: NodeRequest, res: NodeResponse) =>
        adapter.reply(res, {
          body: Buffer.isBuffer(req.body)
            ? { base64: req.body.toString('base64') }
            : req.body,
          rawBody: req.rawBody?.toString('base64') ?? null,
        }),
      );
    const post = (contentType: string, body: string | Buffer) =>
      request(port, {
        method: 'POST',
        headers: { 'content-type': contentType },
        body,
      });

    it('should return the adapter', () => {
      expect(adapter.useBodyParser('json', false)).toBe(adapter);
    });

    it('should read text bodies into a string with the "text" parser', async () => {
      adapter.useBodyParser('text', false);
      echo();

      const res = await post('text/plain', 'Zażółć gęślą jaźń');

      expect(JSON.parse(res.text)).toEqual({
        body: 'Zażółć gęślą jaźń',
        rawBody: null,
      });
    });

    it('should read binary bodies into a Buffer with the "raw" parser', async () => {
      adapter.useBodyParser('raw', false);
      echo();
      const payload = Buffer.from([0x00, 0xff, 0x10, 0x80]);

      const res = await post('application/octet-stream', payload);

      expect(JSON.parse(res.text).body).toEqual({
        base64: payload.toString('base64'),
      });
    });

    it('should parse json bodies with the given options', async () => {
      adapter.useBodyParser('json', false, { limit: 16 });
      echo();

      const small = await post('application/json', '{"a":1}');
      const tooLarge = await post('application/json', '{"a":"0123456789"}');

      expect(JSON.parse(small.text).body).toEqual({ a: 1 });
      expect(tooLarge.status).toBe(413);
    });

    it('should parse urlencoded bodies with the given options', async () => {
      adapter.useBodyParser('urlencoded', false, { extended: false });
      echo();

      const res = await post(
        'application/x-www-form-urlencoded',
        'user[name]=Kamil&tag=a&tag=b',
      );

      expect(JSON.parse(res.text).body).toEqual({
        'user[name]': 'Kamil',
        tag: ['a', 'b'],
      });
    });

    it('should expose the exact bytes of the body as req.rawBody when rawBody is true', async () => {
      adapter.useBodyParser('text', true);
      echo();
      const payload = Buffer.from('Zażółć\r\n  gęślą jaźń ');

      const res = await post('text/plain; charset=utf-8', payload);
      const { body, rawBody } = JSON.parse(res.text);

      expect(body).toBe(payload.toString());
      expect(Buffer.from(rawBody, 'base64')).toEqual(payload);
    });
  });

  describe('enableCors', () => {
    let port: number;

    beforeEach(async () => {
      port = await startServer();
    });

    const routeTo = (path: string) =>
      adapter.all(path, (req: NodeRequest, res: NodeResponse) =>
        adapter.reply(res, 'ok'),
      );
    const preflight = (path: string, origin: string) =>
      request(port, {
        method: 'OPTIONS',
        path,
        headers: { origin, 'access-control-request-method': 'PUT' },
      });

    it('should answer a preflight request with the CORS headers', async () => {
      adapter.enableCors();
      routeTo('/cats');

      const res = await preflight('/cats', 'http://client.test');

      expect(res.status).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBe('*');
      expect(res.headers['access-control-allow-methods']).toContain('PUT');
    });

    it('should add the CORS headers to the responses of the routes', async () => {
      adapter.enableCors();
      routeTo('/cats');

      const res = await request(port, {
        path: '/cats',
        headers: { origin: 'http://client.test' },
      });

      expect(res.text).toBe('ok');
      expect(res.headers['access-control-allow-origin']).toBe('*');
    });

    it('should apply the given options', async () => {
      adapter.enableCors({
        origin: 'http://client.test',
        credentials: true,
        methods: ['GET', 'PUT'],
      });
      routeTo('/cats');

      const res = await preflight('/cats', 'http://client.test');

      expect(res.headers['access-control-allow-origin']).toBe(
        'http://client.test',
      );
      expect(res.headers['access-control-allow-credentials']).toBe('true');
      expect(res.headers['access-control-allow-methods']).toContain('PUT');
      expect(res.headers['access-control-allow-methods']).not.toContain(
        'DELETE',
      );
    });

    it('should accept an options delegate', async () => {
      adapter.enableCors((req: NodeRequest, callback) =>
        callback(null, {
          origin: req.headers.origin === 'http://trusted.test',
        }),
      );
      routeTo('/cats');
      const get = (origin: string) =>
        request(port, { path: '/cats', headers: { origin } });

      const trusted = await get('http://trusted.test');
      const untrusted = await get('http://untrusted.test');

      expect(trusted.headers['access-control-allow-origin']).toBe(
        'http://trusted.test',
      );
      expect(untrusted.text).toBe('ok');
      expect(untrusted.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('useStaticAssets', () => {
    let rootDir: string;
    let publicDir: string;

    beforeAll(() => {
      rootDir = mkdtempSync(join(tmpdir(), 'nest-node-adapter-static-'));
      publicDir = join(rootDir, 'public');
      mkdirSync(publicDir);
      writeFileSync(join(publicDir, 'hello.txt'), 'Hello from a file');
      writeFileSync(join(rootDir, 'secret.txt'), 'top secret');
    });

    afterAll(() => rmSync(rootDir, { recursive: true, force: true }));

    it('should serve the files of the directory', async () => {
      adapter.useStaticAssets(publicDir);
      const port = await startServer();

      const res = await request(port, { path: '/hello.txt' });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/^text\/plain/);
      expect(res.text).toBe('Hello from a file');
    });

    it('should serve the files under the prefix only', async () => {
      adapter.useStaticAssets(publicDir, { prefix: '/static' });
      const port = await startServer();

      const prefixed = await request(port, { path: '/static/hello.txt' });
      const unprefixed = await request(port, { path: '/hello.txt' });

      expect(prefixed.status).toBe(200);
      expect(prefixed.text).toBe('Hello from a file');
      expect(unprefixed.status).toBe(404);
    });

    it('should pass the options on to serve-static', async () => {
      adapter.useStaticAssets(publicDir, {
        prefix: '/static',
        extensions: ['txt'],
      });
      const port = await startServer();

      const res = await request(port, { path: '/static/hello' });

      expect(res.status).toBe(200);
      expect(res.text).toBe('Hello from a file');
    });

    it.each([
      '/static/../secret.txt',
      '/static/%2e%2e/secret.txt',
      '/static/..%2fsecret.txt',
    ])(
      'should not serve a file outside of the directory for %s',
      async path => {
        adapter.useStaticAssets(publicDir, { prefix: '/static' });
        const port = await startServer();

        const res = await request(port, { path });

        expect(res.status).not.toBe(200);
        expect(res.text).not.toContain('top secret');
      },
    );
  });

  describe('createMiddlewareFactory', () => {
    // Routes passed to "forRoutes()" as plain strings carry no request method
    // (see RoutesMapper.getRouteInfoFromPath)
    const NO_REQUEST_METHOD = -1 as RequestMethod;
    let port: number;
    let calls: string[];

    beforeEach(async () => {
      port = await startServer();
      calls = [];
    });

    const register = (requestMethod: RequestMethod, path: string) =>
      adapter.createMiddlewareFactory(requestMethod)(
        path,
        (req: NodeRequest, res: NodeResponse, next: Next) => {
          calls.push(`${req.method} ${req.originalUrl}`);
          next();
        },
      );
    // Registered after the middleware, which has to run first
    const answerEverything = () =>
      adapter.use((req: NodeRequest, res: NodeResponse) => res.end('done'));
    const send = async (...requests: [method: string, path: string][]) => {
      for (const [method, path] of requests) {
        await request(port, { method, path });
      }
    };

    it('should run a middleware registered for a method for that method (and HEAD for GET), on the exact path', async () => {
      register(RequestMethod.GET, '/users');
      answerEverything();

      await send(
        ['GET', '/users'],
        ['GET', '/users/'],
        ['HEAD', '/users'],
        ['POST', '/users'],
        ['GET', '/users/1'],
        ['GET', '/usersx'],
      );

      expect(calls).toEqual(['GET /users', 'GET /users/', 'HEAD /users']);
    });

    it('should run a middleware registered for RequestMethod.ALL for every method, on the exact path', async () => {
      register(RequestMethod.ALL, '/users');
      answerEverything();

      await send(
        ['GET', '/users'],
        ['POST', '/users'],
        ['DELETE', '/users'],
        ['GET', '/users/1'],
      );

      expect(calls).toEqual(['GET /users', 'POST /users', 'DELETE /users']);
    });

    it('should mount a middleware registered with no method (-1) on the path, for every method and sub-path', async () => {
      register(NO_REQUEST_METHOD, '/users');
      answerEverything();

      await send(
        ['GET', '/users'],
        ['POST', '/users/1/posts'],
        ['GET', '/usersx'],
        ['GET', '/other'],
      );

      expect(calls).toEqual(['GET /users', 'POST /users/1/posts']);
    });

    it('should hand a mounted middleware the URL relative to its path, and restore it afterwards', async () => {
      adapter.createMiddlewareFactory(NO_REQUEST_METHOD)(
        '/api',
        (req: NodeRequest, res: NodeResponse, next: Next) => {
          res.setHeader('x-mounted', `${req.baseUrl} ${req.url}`);
          next();
        },
      );
      adapter.use((req: NodeRequest, res: NodeResponse) =>
        res.end(`${req.baseUrl} ${req.url}`),
      );

      const res = await request(port, { path: '/api/users?page=2' });

      expect(res.headers['x-mounted']).toBe('/api /users?page=2');
      expect(res.text).toBe(' /api/users?page=2');
    });

    it('should expose the parameters of the middleware path', async () => {
      adapter.createMiddlewareFactory(RequestMethod.GET)(
        '/users/:id',
        (req: NodeRequest, res: NodeResponse, next: Next) => {
          res.setHeader('x-user-id', req.params.id);
          next();
        },
      );
      answerEverything();

      const res = await request(port, { path: '/users/42' });

      expect(res.headers['x-user-id']).toBe('42');
    });

    it('should run a middleware for an exact-match path ("$") on that path only, for every method', async () => {
      register(NO_REQUEST_METHOD, '/api$');
      answerEverything();

      await send(
        ['GET', '/api'],
        ['POST', '/api?x=1'],
        ['GET', '/api/'],
        ['GET', '/api/users'],
        ['GET', '/apix'],
      );

      expect(calls).toEqual(['GET /api', 'POST /api?x=1']);
    });

    it('should filter an exact-match path ("$") by method', async () => {
      register(RequestMethod.GET, '/api$');
      answerEverything();

      await send(['GET', '/api'], ['POST', '/api']);

      expect(calls).toEqual(['GET /api']);
    });

    it('should run once per request when the exact-match path is registered next to its wildcard entry', async () => {
      // How the core applies a wildcard middleware under a global prefix
      register(NO_REQUEST_METHOD, '/api$');
      register(NO_REQUEST_METHOD, '/api/{*path}');
      answerEverything();

      await send(
        ['GET', '/api'],
        ['GET', '/api/'],
        ['GET', '/api/users'],
        ['POST', '/api/users/1'],
        ['GET', '/other'],
      );

      expect(calls).toEqual([
        'GET /api',
        'GET /api/',
        'GET /api/users',
        'POST /api/users/1',
      ]);
    });

    it('should throw a TypeError for an invalid path', () => {
      const printError = vi
        .spyOn(LegacyRouteConverter, 'printError')
        .mockImplementation(() => {});
      const factory = adapter.createMiddlewareFactory(RequestMethod.GET);

      expect(() => factory('/users/:', () => {})).toThrow(TypeError);
      expect(printError).toHaveBeenCalledWith('/users/:');
    });
  });

  describe('applyVersionFilter', () => {
    let handler: ReturnType<typeof vi.fn>;
    let next: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      handler = vi.fn();
      next = vi.fn();
    });

    const call = (
      versioned: (req: any, res: any, next: () => void) => unknown,
      headers: Record<string, string> = {},
    ) => {
      const req = { headers };
      const res = {};
      versioned(req, res, next);
      return { req, res };
    };

    it('should always call the handler with URI versioning, as the version is in the path', () => {
      const versioned = adapter.applyVersionFilter(handler, '1', {
        type: VersioningType.URI,
      });

      const { req, res } = call(versioned, { 'x-api-version': '2' });

      expect(handler).toHaveBeenCalledExactlyOnceWith(req, res, next);
      expect(next).not.toHaveBeenCalled();
    });

    it.each<[string, VersioningOptions]>([
      ['HEADER', { type: VersioningType.HEADER, header: 'X-API-Version' }],
      ['MEDIA_TYPE', { type: VersioningType.MEDIA_TYPE, key: 'v=' }],
      ['CUSTOM', { type: VersioningType.CUSTOM, extractor: () => '2' }],
    ])(
      'should always call the handler of a VERSION_NEUTRAL route (%s versioning)',
      (_, versioningOptions) => {
        const versioned = adapter.applyVersionFilter(
          handler,
          VERSION_NEUTRAL,
          versioningOptions,
        );

        call(versioned);
        call(versioned, { 'x-api-version': '2', accept: 'text/html;v=2' });

        expect(handler).toHaveBeenCalledTimes(2);
        expect(next).not.toHaveBeenCalled();
      },
    );

    describe('with HEADER versioning', () => {
      const options: VersioningOptions = {
        type: VersioningType.HEADER,
        header: 'X-API-Version',
      };

      it('should call the handler when the header carries the version', () => {
        const versioned = adapter.applyVersionFilter(handler, '1', options);

        const { req, res } = call(versioned, { 'x-api-version': '1' });

        expect(handler).toHaveBeenCalledExactlyOnceWith(req, res, next);
        expect(next).not.toHaveBeenCalled();
      });

      it('should call next() for another version, or no version', () => {
        const versioned = adapter.applyVersionFilter(handler, '1', options);

        call(versioned, { 'x-api-version': '2' });
        call(versioned);

        expect(handler).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalledTimes(2);
      });

      it('should call the handler when the header carries one of the versions', () => {
        const versioned = adapter.applyVersionFilter(
          handler,
          ['1', '2'],
          options,
        );

        call(versioned, { 'x-api-version': '2' });
        call(versioned, { 'x-api-version': '3' });

        expect(handler).toHaveBeenCalledOnce();
        expect(next).toHaveBeenCalledOnce();
      });

      it('should call the handler without a version only when the versions include VERSION_NEUTRAL', () => {
        call(
          adapter.applyVersionFilter(handler, [VERSION_NEUTRAL, '2'], options),
        );
        expect(handler).toHaveBeenCalledOnce();

        call(adapter.applyVersionFilter(handler, ['1', '2'], options));
        expect(next).toHaveBeenCalledOnce();
      });
    });

    describe('with MEDIA_TYPE versioning', () => {
      const options: VersioningOptions = {
        type: VersioningType.MEDIA_TYPE,
        key: 'v=',
      };

      it('should call the handler when the Accept header carries the version', () => {
        const versioned = adapter.applyVersionFilter(handler, '1', options);

        call(versioned, { accept: 'application/json;v=1' });

        expect(handler).toHaveBeenCalledOnce();
        expect(next).not.toHaveBeenCalled();
      });

      it('should call next() for another version, or no version', () => {
        const versioned = adapter.applyVersionFilter(handler, '1', options);

        call(versioned, { accept: 'application/json;v=2' });
        call(versioned, { accept: 'application/json' });
        call(versioned);

        expect(handler).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalledTimes(3);
      });

      it('should call the handler when the Accept header carries one of the versions', () => {
        const versioned = adapter.applyVersionFilter(
          handler,
          ['1', '2'],
          options,
        );

        call(versioned, { accept: 'text/html, application/json;v=2' });
        call(versioned, { accept: 'application/json;v=3' });

        expect(handler).toHaveBeenCalledOnce();
        expect(next).toHaveBeenCalledOnce();
      });

      it('should call the handler without a version only when the versions include VERSION_NEUTRAL', () => {
        call(
          adapter.applyVersionFilter(handler, [VERSION_NEUTRAL, '2'], options),
          { accept: 'application/json' },
        );
        expect(handler).toHaveBeenCalledOnce();

        call(adapter.applyVersionFilter(handler, ['1', '2'], options), {
          accept: 'application/json',
        });
        expect(next).toHaveBeenCalledOnce();
      });
    });

    describe('with CUSTOM versioning', () => {
      it.each<[string | string[], string | string[], boolean]>([
        ['1', '1', true],
        ['1', '2', false],
        ['2', ['3', '2'], true],
        ['2', ['3'], false],
        [['1', '2'], '2', true],
        [['1', '2'], '3', false],
        [['1', '2'], ['3', '2'], true],
        [['1', '2'], ['3', '4'], false],
      ])(
        'should match the version %j against the extracted version %j: %s',
        (version, extracted, matches) => {
          const extractor = vi.fn(() => extracted);
          const versioned = adapter.applyVersionFilter(handler, version, {
            type: VersioningType.CUSTOM,
            extractor,
          });

          const { req } = call(versioned);

          expect(extractor).toHaveBeenCalledWith(req);
          expect(handler).toHaveBeenCalledTimes(matches ? 1 : 0);
          expect(next).toHaveBeenCalledTimes(matches ? 0 : 1);
        },
      );
    });

    it('should throw when the version does not match and there is no next handler', () => {
      const versioned = adapter.applyVersionFilter(handler, '1', {
        type: VersioningType.HEADER,
        header: 'X-API-Version',
      });

      expect(() =>
        versioned({ headers: { 'x-api-version': '2' } }, {}, undefined as any),
      ).toThrow(InternalServerErrorException);
    });

    it('should throw for an unsupported versioning type', () => {
      expect(() =>
        adapter.applyVersionFilter(handler, '1', { type: 99 } as any),
      ).toThrow('Unsupported versioning options');
    });

    it('should let the handlers of the versions of a route pass requests on to each other', async () => {
      const port = await startServer();
      const options: VersioningOptions = {
        type: VersioningType.HEADER,
        header: 'X-API-Version',
      };
      for (const version of ['1', '2']) {
        adapter.get(
          '/cats',
          adapter.applyVersionFilter(
            (req: NodeRequest, res: NodeResponse) =>
              adapter.reply(res, `v${version}`),
            version,
            options,
          ),
        );
      }
      const get = (version: string) =>
        request(port, {
          path: '/cats',
          headers: { 'x-api-version': version },
        });

      expect((await get('1')).text).toBe('v1');
      expect((await get('2')).text).toBe('v2');
      expect((await get('3')).status).toBe(404);
    });
  });

  describe('mapException', () => {
    it('should return an HttpException as is', () => {
      const exception = new HttpException(
        { message: 'invalid signature' },
        401,
      );

      expect(adapter.mapException(exception)).toBe(exception);
    });

    it.each([
      new SyntaxError('Unexpected end of JSON input'),
      new URIError('URI malformed'),
    ])('should map a $name to a BadRequestException', error => {
      const result = adapter.mapException(error) as BadRequestException;

      expect(result).toBeInstanceOf(BadRequestException);
      expect(result.message).toBe(error.message);
    });

    it('should map a client error (http-errors style) to an HttpException with its status', () => {
      const error = Object.assign(new Error('request entity too large'), {
        status: 413,
        statusCode: 413,
        expose: true,
      });

      const result = adapter.mapException(error) as HttpException;

      expect(result).toBeInstanceOf(HttpException);
      expect(result.getStatus()).toBe(413);
      expect(result.message).toBe('request entity too large');
    });

    it.each([
      ['a plain error', new Error('boom')],
      [
        'a server error',
        Object.assign(new Error('boom'), {
          status: 500,
          statusCode: 500,
          expose: false,
        }),
      ],
      [
        'a client error whose message must not be exposed',
        Object.assign(new Error('internal details'), {
          status: 400,
          statusCode: 400,
          expose: false,
        }),
      ],
    ])('should return %s unchanged', (_, error) => {
      expect(adapter.mapException(error)).toBe(error);
    });

    it('should map the errors of the body parsers and of malformed URLs to client errors', async () => {
      const port = await startServer();
      adapter.useBodyParser('json', false, { limit: 32 });
      adapter.post('/items', (req: NodeRequest, res: NodeResponse) =>
        adapter.reply(res, req.body),
      );
      adapter.get('/items/:id', (req: NodeRequest, res: NodeResponse) =>
        adapter.reply(res, req.params),
      );
      adapter.setErrorHandler(
        (err: unknown, req: NodeRequest, res: NodeResponse, next: Next) => {
          const mapped = adapter.mapException(err);
          const status =
            mapped instanceof HttpException ? mapped.getStatus() : 500;
          adapter.reply(
            res,
            { badRequest: mapped instanceof BadRequestException },
            status,
          );
        },
      );
      const postJson = (body: string) =>
        request(port, {
          method: 'POST',
          path: '/items',
          headers: { 'content-type': 'application/json' },
          body,
        });

      const invalidJson = await postJson('{"name":');
      const tooLarge = await postJson(JSON.stringify({ name: 'x'.repeat(64) }));
      const malformedUrl = await request(port, { path: '/items/%FF' });

      expect(invalidJson.status).toBe(400);
      expect(JSON.parse(invalidJson.text)).toEqual({ badRequest: true });
      expect(tooLarge.status).toBe(413);
      expect(malformedUrl.status).toBe(400);
      expect(JSON.parse(malformedUrl.text)).toEqual({ badRequest: true });
    });
  });

  describe('initHttpServer', () => {
    const describeRequest = (req: NodeRequest, res: NodeResponse) =>
      adapter.reply(res, {
        request: req instanceof NodeRequest,
        response: res instanceof NodeResponse,
        protocol: req.protocol,
      });

    it('should create an http server handing NodeRequest and NodeResponse objects to the handlers', async () => {
      const port = await startServer();
      adapter.get('/', describeRequest);

      const res = await request(port);

      expect(adapter.getHttpServer()).toBeInstanceOf(http.Server);
      expect(JSON.parse(res.text)).toEqual({
        request: true,
        response: true,
        protocol: 'http',
      });
    });

    it('should create an https server when given httpsOptions', async () => {
      const port = await startServer({ httpsOptions: { key, cert } });
      adapter.get('/', describeRequest);

      const body = await new Promise<string>((resolve, reject) => {
        https
          .get(
            {
              host: '127.0.0.1',
              port,
              path: '/',
              agent: false,
              rejectUnauthorized: false,
            },
            res => {
              let data = '';
              res.setEncoding('utf8');
              res.on('data', chunk => (data += chunk));
              res.on('end', () => resolve(data));
            },
          )
          .on('error', reject);
      });

      expect(adapter.getHttpServer()).toBeInstanceOf(https.Server);
      expect(JSON.parse(body)).toEqual({
        request: true,
        response: true,
        protocol: 'https',
      });
    });

    describe('forceCloseConnections', () => {
      // Node.js closes idle keep-alive connections itself when the server
      // closes, so these tests hold a request open
      const holdRequestOpen = () => {
        let pending!: (res: NodeResponse) => void;
        const received = new Promise<NodeResponse>(
          resolve => (pending = resolve),
        );
        adapter.get('/', (req: NodeRequest, res: NodeResponse) => pending(res));
        return received;
      };

      it('should destroy the open connections on close()', async () => {
        const port = await startServer({ forceCloseConnections: true });
        const received = holdRequestOpen();
        const response = request(port);
        response.catch(() => {});

        await received;
        await adapter.close();

        await expect(response).rejects.toThrow();
      });

      it('should let the requests in flight finish when not enabled', async () => {
        const port = await startServer();
        const received = holdRequestOpen();
        const response = request(port);

        const res = await received;
        let closed = false;
        const closing = Promise.resolve(adapter.close()).then(
          () => (closed = true),
        );
        await new Promise(resolve => setTimeout(resolve, 50));

        expect(closed).toBe(false);
        res.end('done');
        expect((await response).text).toBe('done');
        await closing;
      });
    });

    describe('return503OnClosing', () => {
      const routeToRoot = () =>
        adapter.get('/', (req: NodeRequest, res: NodeResponse) =>
          adapter.reply(res, 'ok'),
        );

      it('should answer 503 and close the connection once shutting down', async () => {
        const port = await startServer({ return503OnClosing: true });
        routeToRoot();
        const agent = new http.Agent({ keepAlive: true });

        try {
          const before = await request(port, { agent });
          adapter.beforeClose();
          const after = await request(port, { agent });

          expect(before.status).toBe(200);
          expect(before.headers.connection).toBe('keep-alive');
          expect(after.status).toBe(503);
          expect(after.headers.connection).toBe('close');
          expect(after.text).toBe('Service Unavailable');
        } finally {
          agent.destroy();
        }
      });

      it('should keep serving requests while shutting down when not enabled', async () => {
        const port = await startServer();
        routeToRoot();

        adapter.beforeClose();
        const res = await request(port);

        expect(res.status).toBe(200);
        expect(res.text).toBe('ok');
      });
    });
  });

  describe('listen / close', () => {
    it('should listen on the given port and host, and call back once bound', async () => {
      adapter.initHttpServer({});

      const server = await new Promise<http.Server>(resolve => {
        const listening = adapter.listen(0, '127.0.0.1', () =>
          resolve(listening),
        );
      });

      expect(server).toBe(adapter.getHttpServer());
      expect(server.listening).toBe(true);
      expect((server.address() as AddressInfo).address).toBe('127.0.0.1');
    });

    it('should close the server', async () => {
      await startServer();

      await adapter.close();

      expect(adapter.getHttpServer().listening).toBe(false);
    });

    it('should do nothing on close() without a server', () => {
      expect(adapter.close()).toBeUndefined();
    });
  });

  describe('request and response hooks', () => {
    it('should run the request hook first, and route the request once it calls done()', async () => {
      const port = await startServer();
      const calls: string[] = [];
      adapter.setOnRequestHook((req, res, done) => {
        calls.push(`hook ${req.url}`);
        setImmediate(done);
      });
      adapter.get('/cats', (req: NodeRequest, res: NodeResponse) => {
        calls.push('route');
        adapter.reply(res, 'ok');
      });

      const res = await request(port, { path: '/cats' });

      expect(res.text).toBe('ok');
      expect(calls).toEqual(['hook /cats', 'route']);
    });

    it('should call the response hook once the response has been sent', async () => {
      const port = await startServer();
      const onResponse = vi.fn();
      adapter.setOnResponseHook(onResponse);
      adapter.get('/', (req: NodeRequest, res: NodeResponse) =>
        adapter.reply(res, 'ok'),
      );

      await request(port);

      await vi.waitFor(() => expect(onResponse).toHaveBeenCalledOnce());
      const [req, res] = onResponse.mock.calls[0];
      expect(req).toBeInstanceOf(NodeRequest);
      expect(res.writableFinished).toBe(true);
    });
  });

  describe('default final handler', () => {
    let port: number;

    beforeEach(async () => {
      port = await startServer();
    });

    it('should answer an unmatched request with a 404', async () => {
      const res = await request(port, { method: 'POST', path: '/missing?x=1' });

      expect(res.status).toBe(404);
      expect(res.headers['content-type']).toBe('text/plain; charset=utf-8');
      expect(res.text).toBe('Cannot POST /missing');
    });

    it.each([
      ['statusCode', 413],
      ['status', 422],
    ])(
      'should answer an error with the status in its "%s" property',
      async (property, status) => {
        adapter.get('/', () => {
          throw Object.assign(new Error('rejected'), { [property]: status });
        });

        const res = await request(port);

        expect(res.status).toBe(status);
        expect(res.headers['content-type']).toBe('text/plain; charset=utf-8');
      },
    );

    it.each([
      ['a plain error', new Error('db password: hunter2')],
      [
        'an error with a non-error status',
        Object.assign(new Error('db password: hunter2'), { statusCode: 302 }),
      ],
    ])(
      'should answer %s with a 500 that does not leak its message, and log it',
      async (_, error) => {
        const logError = vi
          .spyOn((adapter as any).logger, 'error')
          .mockImplementation(() => {});
        adapter.get('/', () => {
          throw error;
        });

        const res = await request(port);

        expect(res.status).toBe(500);
        expect(res.text).not.toContain('hunter2');
        expect(logError).toHaveBeenCalledOnce();
      },
    );

    it('should destroy the connection when an error occurs after the headers were sent', async () => {
      adapter.get('/', (req: NodeRequest, res: NodeResponse, next: Next) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.write('partial');
        next(new Error('late failure'));
      });

      await expect(request(port)).rejects.toThrow();
    });
  });
});
