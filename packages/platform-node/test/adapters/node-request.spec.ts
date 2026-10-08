import { readFileSync } from 'fs';
import * as http from 'http';
import * as https from 'https';
import type { AddressInfo } from 'net';
import {
  endWithoutBody,
  NodeRequest,
  NodeResponse,
} from '../../adapters/node-request.js';

type Handler = (req: NodeRequest, res: NodeResponse) => void;

interface ClientResponse {
  statusCode: number;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
}

const serverClasses = {
  IncomingMessage: NodeRequest,
  ServerResponse: NodeResponse,
} as http.ServerOptions<typeof NodeRequest, typeof NodeResponse>;

const tlsFixtures = new URL(
  '../../../../integration/microservices/src/tcp-tls/',
  import.meta.url,
);

let server: http.Server | https.Server | undefined;
let handlerError: unknown;

afterEach(async () => {
  handlerError = undefined;
  if (!server) {
    return;
  }
  const closing = server;
  server = undefined;
  closing.closeAllConnections();
  await new Promise(resolve => closing.close(resolve));
});

// A throwing handler resets the connection, and "request()" rethrows its
// error, rather than leaving an uncaught exception and a pending request.
function guard(handler: Handler) {
  return (req: NodeRequest, res: NodeResponse) => {
    try {
      handler(req, res);
    } catch (error) {
      handlerError = error;
      res.destroy();
    }
  };
}

async function start(created: http.Server | https.Server) {
  server = created;
  await new Promise<void>(resolve => created.listen(0, '127.0.0.1', resolve));
  return (created.address() as AddressInfo).port;
}

function listen(handler: Handler, options: http.ServerOptions = {}) {
  return start(
    http.createServer({ ...options, ...serverClasses }, guard(handler)),
  );
}

function listenSecurely(handler: Handler) {
  return start(
    https.createServer(
      {
        key: readFileSync(new URL('privkey.pem', tlsFixtures)),
        cert: readFileSync(new URL('ca.cert.pem', tlsFixtures)),
        ...serverClasses,
      } as https.ServerOptions,
      guard(handler) as http.RequestListener,
    ),
  );
}

function send(port: number, options: https.RequestOptions) {
  return new Promise<ClientResponse>((resolve, reject) => {
    const onResponse = (response: http.IncomingMessage) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => chunks.push(chunk));
      response.on('end', () =>
        resolve({
          statusCode: response.statusCode!,
          headers: response.headers,
          body: Buffer.concat(chunks),
        }),
      );
      response.on('error', reject);
    };
    const requestOptions = {
      host: '127.0.0.1',
      port,
      agent: false,
      ...options,
    };
    const clientRequest =
      options.protocol === 'https:'
        ? https.request(requestOptions, onResponse)
        : http.request(requestOptions, onResponse);
    clientRequest.on('error', reject).end();
  });
}

async function request(port: number, options: https.RequestOptions = {}) {
  let response: ClientResponse | undefined;
  let clientError: unknown;
  try {
    response = await send(port, options);
  } catch (error) {
    clientError = error;
  }
  if (handlerError !== undefined) {
    throw handlerError;
  }
  if (response === undefined) {
    throw clientError;
  }
  return response;
}

async function respond(handler: Handler, options?: http.RequestOptions) {
  return request(await listen(handler), options);
}

/**
 * Sends a request and returns what `read` returned for it on the server.
 */
async function inspect<T>(
  read: (req: NodeRequest, res: NodeResponse) => T,
  options?: http.RequestOptions,
  serverOptions?: http.ServerOptions,
) {
  let result: { value: T } | undefined;
  const port = await listen((req, res) => {
    result = { value: read(req, res) };
    res.end();
  }, serverOptions);
  const response = await request(port, options);
  // Otherwise a test expecting "undefined" would pass without running
  if (!result) {
    throw new Error(`No handler ran (status ${response.statusCode})`);
  }
  return result.value;
}

describe('NodeRequest', () => {
  describe('query', () => {
    it('should parse the query string of the URL', async () => {
      const query = await inspect(req => req.query, {
        path: '/users?name=nest&tag=a&tag=b&greeting=gr%C3%BC%C3%9F+dich',
      });

      expect(query).toEqual({
        name: 'nest',
        tag: ['a', 'b'],
        greeting: 'grüß dich',
      });
    });

    it.each(['/users', '/users?'])(
      'should be an empty object for "%s"',
      async path => {
        expect(await inspect(req => req.query, { path })).toEqual({});
      },
    );

    it('should parse the URL as it is when the query is first read', async () => {
      // Parsing is lazy, so a URL rewritten before the first read is the one
      // that counts
      const query = await inspect(
        req => {
          req.url = '/rewritten?page=2';
          return req.query;
        },
        { path: '/users?page=1' },
      );

      expect(query).toEqual({ page: '2' });
    });

    it('should parse the query string once and keep the parsed object', async () => {
      const [first, second] = await inspect(
        req => {
          const parsed = req.query;
          parsed.added = 'by middleware';
          return [parsed, req.query];
        },
        { path: '/users?page=1' },
      );

      expect(second).toBe(first);
      expect(second).toEqual({ page: '1', added: 'by middleware' });
    });

    it.each([
      { when: 'before', readFirst: false },
      { when: 'after', readFirst: true },
    ])(
      'should let the query be replaced $when it is first read',
      async ({ readFirst }) => {
        const replacement = { page: 3 };
        const query = await inspect(
          req => {
            if (readFirst) {
              void req.query;
            }
            req.query = replacement;
            return req.query;
          },
          { path: '/users?page=1' },
        );

        expect(query).toBe(replacement);
      },
    );
  });

  describe('path', () => {
    it('should be the path the router matches', async () => {
      // Percent-decoded, except for reserved characters such as "%2F"
      expect(await inspect(req => req.path, { path: '/%61dmin?x=1' })).toBe(
        '/admin',
      );
      expect(await inspect(req => req.path, { path: '/files/a%2Fb' })).toBe(
        '/files/a%2Fb',
      );
    });

    it('should be the path of an absolute-form request target', async () => {
      const path = await inspect(req => req.path, {
        path: 'http://example.com/admin?x=1',
      });

      expect(path).toBe('/admin');
    });

    it('should not throw for a malformed URL', async () => {
      const path = await inspect(req => req.path, { path: '/%E0%A4%A?x=1' });

      expect(path).toBe('/%E0%A4%A');
    });

    it.each([
      ['/users/1?page=1&sort=?', '/users/1'],
      ['/users/1', '/users/1'],
      ['/?page=1', '/'],
    ])('should turn "%s" into "%s"', async (url, path) => {
      expect(await inspect(req => req.path, { path: url })).toBe(path);
    });

    it('should follow a rewritten URL', async () => {
      // e.g. relative to a mount path stripped from "url"
      const path = await inspect(
        req => {
          req.url = '/1?page=2';
          return req.path;
        },
        { path: '/users/1?page=2' },
      );

      expect(path).toBe('/1');
    });
  });

  describe('hostname', () => {
    it.each([
      ['example.com', 'example.com'],
      ['example.com:8080', 'example.com'],
      ['[::1]', '[::1]'],
      ['[::1]:3000', '[::1]'],
      ['[2001:db8::1]:8443', '[2001:db8::1]'],
    ])('should read the Host header "%s" as "%s"', async (host, hostname) => {
      expect(await inspect(req => req.hostname, { headers: { host } })).toBe(
        hostname,
      );
    });

    it('should be undefined without a Host header', async () => {
      const hostname = await inspect(
        req => req.hostname,
        { setHost: false },
        { requireHostHeader: false },
      );

      expect(hostname).toBeUndefined();
    });
  });

  describe('ip', () => {
    it('should be the remote address of the socket', async () => {
      expect(await inspect(req => req.ip)).toBe('127.0.0.1');
    });
  });

  describe('protocol and secure', () => {
    it('should be "http" and not secure over plain HTTP', async () => {
      const observed = await inspect(req => [req.protocol, req.secure]);

      expect(observed).toEqual(['http', false]);
    });

    it('should be "https" and secure over TLS', async () => {
      let observed: unknown;
      const port = await listenSecurely((req, res) => {
        observed = [req.protocol, req.secure, req.ip];
        res.end();
      });

      await request(port, { protocol: 'https:', rejectUnauthorized: false });

      expect(observed).toEqual(['https', true, '127.0.0.1']);
    });
  });

  it('should not read hostname, ip or protocol from X-Forwarded-* headers', async () => {
    // They come from the Host header and the socket (as with Express, unless
    // its "trust proxy" setting is enabled)
    const observed = await inspect(
      req => ({ hostname: req.hostname, ip: req.ip, protocol: req.protocol }),
      {
        headers: {
          host: 'example.com',
          'x-forwarded-host': 'proxy.example.com',
          'x-forwarded-for': '203.0.113.7',
          'x-forwarded-proto': 'https',
        },
      },
    );

    expect(observed).toEqual({
      hostname: 'example.com',
      ip: '127.0.0.1',
      protocol: 'http',
    });
  });

  describe('get() and header()', () => {
    it('should prefer a Referrer header to a Referer header, as Express does', async () => {
      const value = await inspect(req => req.get('Referer'), {
        headers: {
          Referer: 'https://a.example/',
          Referrer: 'https://b.example/',
        },
      });

      expect(value).toBe('https://b.example/');
    });

    it.each(['Content-Type', 'content-type', 'CONTENT-TYPE'])(
      'should read a header case-insensitively as "%s"',
      async name => {
        const values = await inspect(req => [req.get(name), req.header(name)], {
          headers: { 'Content-Type': 'application/json' },
        });

        expect(values).toEqual(['application/json', 'application/json']);
      },
    );

    it('should return undefined for a header that was not sent', async () => {
      const values = await inspect(req => [
        req.get('X-Missing'),
        req.header('X-Missing'),
      ]);

      expect(values).toStrictEqual([undefined, undefined]);
    });

    it.each(['Referer', 'referrer', 'REFERRER'])(
      'should read the Referer header as "%s"',
      async name => {
        const values = await inspect(req => [req.get(name), req.header(name)], {
          headers: { Referer: 'https://nestjs.com/' },
        });

        expect(values).toEqual(['https://nestjs.com/', 'https://nestjs.com/']);
      },
    );

    it('should read a Referrer header as "Referer"', async () => {
      const value = await inspect(req => req.get('Referer'), {
        headers: { Referrer: 'https://nestjs.com/' },
      });

      expect(value).toBe('https://nestjs.com/');
    });
  });

  describe('body', () => {
    it('should be present and undefined until a parser sets it', async () => {
      // Express libraries check "'body' in req"
      const [hasBody, body] = await inspect(req => ['body' in req, req.body]);

      expect(hasBody).toBe(true);
      expect(body).toBeUndefined();
    });

    it('should keep a body to the request it was set on', async () => {
      const bodies: unknown[] = [];
      const port = await listen((req, res) => {
        bodies.push(req.body);
        req.body = { parsed: true };
        res.end();
      });

      await request(port);
      await request(port);

      expect(bodies).toStrictEqual([undefined, undefined]);
    });
  });
});

describe('NodeResponse', () => {
  describe('status()', () => {
    it('should set the status code and return the response', async () => {
      let chained = false;
      const response = await respond((req, res) => {
        chained = res.status(201) === res;
        res.end();
      });

      expect(chained).toBe(true);
      expect(response.statusCode).toBe(201);
    });
  });

  describe('send()', () => {
    it('should send the Content-Length in answer to a HEAD request', async () => {
      const response = await respond((req, res) => res.send('héllo'), {
        method: 'HEAD',
      });

      expect(response.headers['content-length']).toBe(
        String(Buffer.byteLength('héllo')),
      );
      expect(response.body).toHaveLength(0);
    });

    it('should send a string as UTF-8 text, with its length in bytes', async () => {
      const text = 'Grüß Gott, Nest!';
      const response = await respond((req, res) => res.send(text));

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe(
        'text/plain; charset=utf-8',
      );
      expect(response.headers['content-length']).toBe(
        String(Buffer.byteLength(text)),
      );
      expect(response.body.toString()).toBe(text);
    });

    it.each([
      { kind: 'an object', body: { id: 1, name: 'Grüß' } },
      { kind: 'an array', body: [1, 'two'] },
    ])('should send $kind as JSON', async ({ body }) => {
      const json = JSON.stringify(body);
      const response = await respond((req, res) => res.send(body));

      expect(response.headers['content-type']).toBe(
        'application/json; charset=utf-8',
      );
      expect(response.headers['content-length']).toBe(
        String(Buffer.byteLength(json)),
      );
      expect(response.body.toString()).toBe(json);
    });

    it.each([
      { kind: 'a Buffer', body: Buffer.from([0, 1, 2, 255]) },
      { kind: 'a Uint8Array', body: new Uint8Array([0, 1, 2, 255]) },
    ])('should send $kind as binary', async ({ body }) => {
      const response = await respond((req, res) => res.send(body));

      expect(response.headers['content-type']).toBe('application/octet-stream');
      expect(response.headers['content-length']).toBe('4');
      expect([...response.body]).toEqual([0, 1, 2, 255]);
    });

    it.each([
      { kind: 'a number', body: 42, text: '42' },
      { kind: 'a boolean', body: true, text: 'true' },
    ])('should send $kind as text', async ({ body, text }) => {
      const response = await respond((req, res) => res.send(body));

      expect(response.headers['content-type']).toBe(
        'text/plain; charset=utf-8',
      );
      expect(response.body.toString()).toBe(text);
    });

    it.each([
      { kind: 'a string', body: '<p>Hello</p>', type: 'text/html' },
      {
        kind: 'an object',
        body: { title: 'Oops' },
        type: 'application/problem+json',
      },
      { kind: 'a Buffer', body: Buffer.from('GIF89a'), type: 'image/gif' },
    ])(
      'should keep a Content-Type set earlier for $kind',
      async ({ body, type }) => {
        const response = await respond((req, res) =>
          res.set('Content-Type', type).send(body),
        );

        expect(response.headers['content-type']).toBe(type);
      },
    );

    it.each([undefined, null])(
      'should end the response without a body for %s',
      async body => {
        const response = await respond((req, res) => res.send(body));

        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toBeUndefined();
        expect(response.body).toHaveLength(0);
      },
    );
  });

  describe('json()', () => {
    it('should send the Content-Length in answer to a HEAD request', async () => {
      const body = { name: 'nést' };
      const response = await respond((req, res) => res.json(body), {
        method: 'HEAD',
      });

      expect(response.headers['content-length']).toBe(
        String(Buffer.byteLength(JSON.stringify(body))),
      );
      expect(response.body).toHaveLength(0);
    });

    it.each([
      { kind: 'an object', body: { name: 'Grüß' } },
      { kind: 'a string', body: 'Nest' },
      { kind: 'null', body: null },
    ])('should send $kind as JSON', async ({ body }) => {
      const json = JSON.stringify(body);
      const response = await respond((req, res) => res.json(body));

      expect(response.headers['content-type']).toBe(
        'application/json; charset=utf-8',
      );
      expect(response.headers['content-length']).toBe(
        String(Buffer.byteLength(json)),
      );
      expect(response.body.toString()).toBe(json);
    });

    it('should keep a Content-Type set earlier', async () => {
      const response = await respond((req, res) =>
        res.set('Content-Type', 'application/vnd.api+json').json({ data: [] }),
      );

      expect(response.headers['content-type']).toBe('application/vnd.api+json');
      expect(response.body.toString()).toBe('{"data":[]}');
    });
  });

  // send() gets a string body, since it hands objects over to json()
  describe.each([
    { method: 'send', body: 'ignored' },
    { method: 'json', body: { ignored: true } },
  ] as const)(
    '$method() with a status that forbids a body',
    ({ method, body }) => {
      it.each([
        { statusCode: 204, contentLength: undefined },
        { statusCode: 205, contentLength: '0' },
        { statusCode: 304, contentLength: undefined },
      ])(
        'should end a $statusCode response without a body',
        async ({ statusCode, contentLength }) => {
          const response = await respond((req, res) =>
            res.status(statusCode)[method](body),
          );

          expect(response.statusCode).toBe(statusCode);
          expect(response.headers['content-type']).toBeUndefined();
          expect(response.headers['content-length']).toBe(contentLength);
          expect(response.body).toHaveLength(0);
        },
      );
    },
  );

  describe('set() and header()', () => {
    it.each(['set', 'header'] as const)(
      '%s() should set a header and return the response',
      async method => {
        let chained = false;
        const response = await respond((req, res) => {
          chained = res[method]('X-Powered-By', 'Nest') === res;
          res.end();
        });

        expect(chained).toBe(true);
        expect(response.headers['x-powered-by']).toBe('Nest');
      },
    );

    it.each(['set', 'header'] as const)(
      '%s() should set every header of an object',
      async method => {
        let chained = false;
        const response = await respond((req, res) => {
          chained =
            res[method]({ 'X-Request-Id': 'abc', 'X-Retry': 3 }) === res;
          res.end();
        });

        expect(chained).toBe(true);
        expect(response.headers['x-request-id']).toBe('abc');
        expect(response.headers['x-retry']).toBe('3');
      },
    );

    it('should convert values, and the items of an array, to strings', async () => {
      const values = await inspect((req, res) => {
        res.set('X-Count', 3).set('X-List', [1, 'two']);
        return [res.getHeader('X-Count'), res.getHeader('X-List')];
      });

      expect(values).toEqual(['3', ['1', 'two']]);
    });
  });

  describe('get()', () => {
    it('should return a header set earlier, case-insensitively', async () => {
      const values = await inspect((req, res) => {
        res.setHeader('X-Request-Id', 'abc');
        return [res.get('X-Request-Id'), res.get('x-request-id')];
      });

      expect(values).toEqual(['abc', 'abc']);
    });

    it('should return undefined for a header that was not set', async () => {
      expect(await inspect((req, res) => res.get('X-Missing'))).toBeUndefined();
    });
  });

  describe('type()', () => {
    it.each([
      ['.html', 'text/html; charset=utf-8'],
      ['JSON', 'application/json; charset=utf-8'],
      ['png', 'image/png'],
    ])('should look up "%s" as Express does', async (type, contentType) => {
      const response = await respond((req, res) => res.type(type).end());

      expect(response.headers['content-type']).toBe(contentType);
    });

    // The same content types as Express' mime lookup
    it.each([
      ['json', 'application/json; charset=utf-8'],
      ['html', 'text/html; charset=utf-8'],
      ['text', 'text/plain; charset=utf-8'],
      ['txt', 'text/plain; charset=utf-8'],
      ['xml', 'application/xml'],
      ['js', 'text/javascript; charset=utf-8'],
      ['css', 'text/css; charset=utf-8'],
      ['bin', 'application/octet-stream'],
    ])('should map "%s" to "%s"', async (type, contentType) => {
      const response = await respond((req, res) => res.type(type).end());

      expect(response.headers['content-type']).toBe(contentType);
    });

    it.each(['application/vnd.api+json', 'image/svg+xml'])(
      'should use the full MIME type "%s" as is',
      async type => {
        const response = await respond((req, res) => res.type(type).end());

        expect(response.headers['content-type']).toBe(type);
      },
    );

    it('should fall back to application/octet-stream for an unknown type', async () => {
      const response = await respond((req, res) => res.type('unknown').end());

      expect(response.headers['content-type']).toBe('application/octet-stream');
    });

    it('should return the response', async () => {
      expect(await inspect((req, res) => res.type('json') === res)).toBe(true);
    });
  });

  describe('sendStatus()', () => {
    it.each([204, 304])(
      'should send %i without a body or Content-Type',
      async statusCode => {
        const response = await respond((req, res) =>
          res.sendStatus(statusCode),
        );

        expect(response.statusCode).toBe(statusCode);
        expect(response.headers['content-type']).toBeUndefined();
        expect(response.headers['content-length']).toBeUndefined();
        expect(response.body).toHaveLength(0);
      },
    );

    it('should send 205 without a body or Content-Type, and a zero Content-Length', async () => {
      const response = await respond((req, res) => res.sendStatus(205));

      expect(response.statusCode).toBe(205);
      expect(response.headers['content-type']).toBeUndefined();
      expect(response.headers['content-length']).toBe('0');
      expect(response.body).toHaveLength(0);
    });

    it.each([
      [200, 'OK'],
      [404, 'Not Found'],
      [503, 'Service Unavailable'],
    ])('should send %i with "%s" as a text body', async (statusCode, text) => {
      const response = await respond((req, res) => res.sendStatus(statusCode));

      expect(response.statusCode).toBe(statusCode);
      expect(response.headers['content-type']).toBe(
        'text/plain; charset=utf-8',
      );
      expect(response.body.toString()).toBe(text);
    });

    it('should send the status code itself when it has no reason phrase', async () => {
      const response = await respond((req, res) => res.sendStatus(599));

      expect(response.statusCode).toBe(599);
      expect(response.body.toString()).toBe('599');
    });
  });
});

describe('endWithoutBody', () => {
  it.each([200, 201, 404])(
    'should leave a %i response untouched',
    async statusCode => {
      let ended: boolean | undefined;
      let writableEnded: boolean | undefined;
      const response = await respond((req, res) => {
        res.statusCode = statusCode;
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Length', '5');
        ended = endWithoutBody(res);
        writableEnded = res.writableEnded;
        res.end('hello');
      });

      expect(ended).toBe(false);
      expect(writableEnded).toBe(false);
      expect(response.statusCode).toBe(statusCode);
      expect(response.headers['content-type']).toBe('text/plain');
      expect(response.headers['content-length']).toBe('5');
      expect(response.body.toString()).toBe('hello');
    },
  );

  it.each([
    { statusCode: 204, contentLength: undefined },
    { statusCode: 205, contentLength: '0' },
    { statusCode: 304, contentLength: undefined },
  ])(
    'should end a $statusCode response without a body or the headers describing one',
    async ({ statusCode, contentLength }) => {
      let ended: boolean | undefined;
      let writableEnded: boolean | undefined;
      const response = await respond((req, res) => {
        res.statusCode = statusCode;
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Length', '5');
        res.setHeader('Transfer-Encoding', 'chunked');
        res.setHeader('ETag', '"v1"');
        ended = endWithoutBody(res);
        writableEnded = res.writableEnded;
      });

      expect(ended).toBe(true);
      expect(writableEnded).toBe(true);
      expect(response.statusCode).toBe(statusCode);
      expect(response.headers['content-type']).toBeUndefined();
      expect(response.headers['transfer-encoding']).toBeUndefined();
      expect(response.headers['content-length']).toBe(contentLength);
      expect(response.headers.etag).toBe('"v1"');
      expect(response.body).toHaveLength(0);
    },
  );
});
