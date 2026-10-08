import { once } from 'events';
import http, { IncomingMessage, ServerResponse } from 'http';
import { connect, type AddressInfo } from 'net';
import { brotliCompressSync, deflateSync, gzipSync } from 'zlib';
import { UnauthorizedException } from '@nestjs/common';
import { json, raw, text, urlencoded } from '../../body-parser/body-parser.js';

type Middleware = ReturnType<typeof json>;

interface ParsedRequest extends IncomingMessage {
  body?: any;
  rawBody?: Buffer;
}

interface TestRequest {
  method?: string;
  headers?: Record<string, string>;
  /**
   * Sent with a Content-Length, or with chunked transfer encoding when given
   * as several chunks.
   */
  body?: string | Buffer | Array<string | Buffer>;
}

interface Outcome {
  status: number;
  req: ParsedRequest;
  /** The error the parsers passed to `next()`, if any. */
  error?: any;
}

const JSON_TYPE = { 'content-type': 'application/json' };
const FORM_TYPE = { 'content-type': 'application/x-www-form-urlencoded' };
const TEXT_TYPE = { 'content-type': 'text/plain' };
const BINARY_TYPE = { 'content-type': 'application/octet-stream' };

const servers: http.Server[] = [];

async function listen(server: http.Server) {
  servers.push(server);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return (server.address() as AddressInfo).port;
}

/**
 * Starts a server running `parsers` in order, like the adapter's middleware
 * chain, and returns a function sending one request to it.
 */
async function startServer(...parsers: Middleware[]) {
  const outcomes: Omit<Outcome, 'status'>[] = [];
  const server = http.createServer((req, res) => {
    const outcome: Omit<Outcome, 'status'> = { req };
    outcomes.push(outcome);
    const runParser = (index: number) => {
      if (index === parsers.length) {
        res.end();
        return;
      }
      parsers[index](req, res, (error?: any) => {
        if (error) {
          outcome.error = error;
          res.statusCode = error.status ?? 500;
          res.end();
          return;
        }
        runParser(index + 1);
      });
    };
    runParser(0);
  });
  const port = await listen(server);

  return ({ method = 'POST', headers = {}, body }: TestRequest = {}) =>
    new Promise<Outcome>((resolve, reject) => {
      const request = http.request(
        { host: '127.0.0.1', port, method, path: '/', headers },
        response => {
          response.resume();
          response.on('end', () =>
            resolve({ ...outcomes.at(-1)!, status: response.statusCode! }),
          );
        },
      );
      request.on('error', reject);
      if (Array.isArray(body)) {
        body.forEach(chunk => request.write(chunk));
        request.end();
      } else {
        request.end(body);
      }
    });
}

async function send(parser: Middleware, request: TestRequest) {
  return (await startServer(parser))(request);
}

function expectHttpError(error: any, status: number, type: string) {
  expect(error).toBeInstanceOf(Error);
  expect(error).toMatchObject({
    status,
    statusCode: status,
    expose: true,
    type,
  });
}

describe('body parsers', () => {
  afterEach(async () => {
    delete (Object.prototype as any).polluted;
    await Promise.all(
      servers.splice(0).map(server => {
        server.closeAllConnections();
        return new Promise(resolve => server.close(resolve));
      }),
    );
  });

  describe('json', () => {
    it('should parse an application/json body into req.body', async () => {
      const { status, req } = await send(json(), {
        headers: JSON_TYPE,
        body: '{"name":"nest","tags":["a","b"]}',
      });

      expect(status).toBe(200);
      expect(req.body).toEqual({ name: 'nest', tags: ['a', 'b'] });
    });

    it('should give an empty object for an empty body', async () => {
      const { status, req } = await send(json(), {
        headers: { ...JSON_TYPE, 'content-length': '0' },
        body: '',
      });

      expect(status).toBe(200);
      expect(req.body).toEqual({});
    });

    it('should skip a request without a body and leave req.body undefined', async () => {
      const { status, req, error } = await send(json(), {
        method: 'GET',
        headers: JSON_TYPE,
      });

      expect(req.headers).not.toHaveProperty('content-length');
      expect(req.headers).not.toHaveProperty('transfer-encoding');
      expect(status).toBe(200);
      expect(error).toBeUndefined();
      expect(req.body).toBeUndefined();
    });

    it('should leave a body of another media type unread for the next parser', async () => {
      const request = await startServer(json(), text());

      const { req } = await request({ headers: TEXT_TYPE, body: 'hello' });

      expect(req.body).toBe('hello');
    });

    describe('strict', () => {
      it.each(['"nest"', '42'])(
        'should reject the top-level primitive %s with 400 by default',
        async body => {
          const { status, error, req } = await send(json(), {
            headers: JSON_TYPE,
            body,
          });

          expect(status).toBe(400);
          expect(error).toBeInstanceOf(SyntaxError);
          expectHttpError(error, 400, 'entity.parse.failed');
          expect(error.body).toBe(body);
          expect(req.body).toBeUndefined();
        },
      );

      it.each([
        ['"nest"', 'nest'],
        ['42', 42],
      ])(
        'should accept the top-level primitive %s with strict: false',
        async (body, expected) => {
          const { status, req } = await send(json({ strict: false }), {
            headers: JSON_TYPE,
            body,
          });

          expect(status).toBe(200);
          expect(req.body).toBe(expected);
        },
      );
    });

    it('should reject invalid JSON with a 400 SyntaxError', async () => {
      const { status, error } = await send(json(), {
        headers: JSON_TYPE,
        body: '{"name":',
      });

      expect(status).toBe(400);
      expect(error).toBeInstanceOf(SyntaxError);
      expectHttpError(error, 400, 'entity.parse.failed');
      expect(error.body).toBe('{"name":');
    });

    it.each([true, false])(
      'should reject a body of only whitespace with 400 (strict: %s)',
      async strict => {
        const { status, error } = await send(json({ strict }), {
          headers: JSON_TYPE,
          body: ' \r\n',
        });

        expect(status).toBe(400);
        expectHttpError(error, 400, 'entity.parse.failed');
      },
    );

    it('should ignore a UTF-8 byte order mark', async () => {
      const { status, req } = await send(json(), {
        headers: JSON_TYPE,
        body: '\uFEFF{"name":"nest"}',
      });

      expect(status).toBe(200);
      expect(req.body).toEqual({ name: 'nest' });
    });

    it('should pass the reviver to JSON.parse', async () => {
      const reviver = (key: string, value: any) =>
        key === 'date' ? new Date(value) : value;

      const { req } = await send(json({ reviver }), {
        headers: JSON_TYPE,
        body: '{"date":"2020-01-02T03:04:05.000Z","count":1}',
      });

      expect(req.body).toEqual({
        date: new Date('2020-01-02T03:04:05.000Z'),
        count: 1,
      });
    });

    describe('type', () => {
      it.each([
        {
          name: 'a media type',
          type: 'application/csp-report',
          contentType: 'application/csp-report',
          parsed: true,
        },
        {
          name: 'a media type replacing the default',
          type: 'application/csp-report',
          contentType: 'application/json',
          parsed: false,
        },
        {
          name: 'an array of media types',
          type: ['application/json', 'application/csp-report'],
          contentType: 'application/csp-report',
          parsed: true,
        },
        {
          name: 'a wildcard pattern',
          type: 'application/*+json',
          contentType: 'application/vnd.api+json',
          parsed: true,
        },
        {
          name: 'an extension name',
          type: 'json',
          contentType: 'application/json; charset=utf-8',
          parsed: true,
        },
      ])(
        'should accept $name ($contentType parsed: $parsed)',
        async ({ type, contentType, parsed }) => {
          const { req } = await send(json({ type }), {
            headers: { 'content-type': contentType },
            body: '{"name":"nest"}',
          });

          expect(req.body).toEqual(parsed ? { name: 'nest' } : undefined);
        },
      );

      it('should let a function decide which requests to parse', async () => {
        const type = vi.fn(
          (req: IncomingMessage) => req.headers['x-parse'] === 'json',
        );
        const request = await startServer(json({ type }));

        const accepted = await request({
          headers: { ...TEXT_TYPE, 'x-parse': 'json' },
          body: '{"name":"nest"}',
        });
        const skipped = await request({
          headers: JSON_TYPE,
          body: '{"name":"nest"}',
        });

        expect(type).toHaveBeenCalledWith(accepted.req);
        expect(accepted.req.body).toEqual({ name: 'nest' });
        expect(skipped.req.body).toBeUndefined();
      });
    });
  });

  describe('limit', () => {
    it('should default to 100kb', async () => {
      const request = await startServer(text());

      const atLimit = await request({
        headers: TEXT_TYPE,
        body: 'a'.repeat(100 * 1024),
      });
      const overLimit = await request({
        headers: TEXT_TYPE,
        body: 'a'.repeat(100 * 1024 + 1),
      });

      expect(atLimit.status).toBe(200);
      expect(atLimit.req.body).toHaveLength(100 * 1024);
      expect(overLimit.status).toBe(413);
    });

    it('should accept a number of bytes and reject a larger declared Content-Length with 413', async () => {
      const request = await startServer(raw({ limit: 10 }));

      const atLimit = await request({
        headers: BINARY_TYPE,
        body: '0123456789',
      });
      const overLimit = await request({
        headers: BINARY_TYPE,
        body: '0123456789!',
      });

      expect(atLimit.status).toBe(200);
      expect(overLimit.status).toBe(413);
      expectHttpError(overLimit.error, 413, 'entity.too.large');
      expect(overLimit.error).toMatchObject({
        expected: 11,
        length: 11,
        limit: 10,
      });
    });

    it('should accept a string with a unit', async () => {
      const request = await startServer(text({ limit: '1kb' }));

      const atLimit = await request({
        headers: TEXT_TYPE,
        body: 'a'.repeat(1024),
      });
      const overLimit = await request({
        headers: TEXT_TYPE,
        body: 'a'.repeat(1025),
      });

      expect(atLimit.status).toBe(200);
      expect(overLimit.status).toBe(413);
      expectHttpError(overLimit.error, 413, 'entity.too.large');
    });

    it('should reject a body streamed past the limit without a Content-Length with 413', async () => {
      const { status, error, req } = await send(raw({ limit: 10 }), {
        headers: BINARY_TYPE,
        body: ['012345', '678901'],
      });

      expect(req.headers['transfer-encoding']).toBe('chunked');
      expect(status).toBe(413);
      expectHttpError(error, 413, 'entity.too.large');
      expect(error).toMatchObject({ limit: 10, received: 12 });
    });

    it('should reject a compressed body that inflates past the limit with 413', async () => {
      const compressed = gzipSync(`[${'0,'.repeat(100 * 1024)}0]`);
      expect(compressed.length).toBeLessThan(1024);

      const { status, error } = await send(json(), {
        headers: { ...JSON_TYPE, 'content-encoding': 'gzip' },
        body: compressed,
      });

      expect(status).toBe(413);
      expectHttpError(error, 413, 'entity.too.large');
      expect(error.limit).toBe(100 * 1024);
      expect(error.received).toBeGreaterThan(100 * 1024);
    });

    it.each([-1, NaN, Infinity, 'abc', '10 parsecs'])(
      'should throw when the parser is created with the limit %s',
      limit => {
        expect(() => json({ limit })).toThrow(TypeError);
      },
    );

    it('should validate the limit of every parser', () => {
      for (const parser of [json, urlencoded, text, raw]) {
        expect(() => parser({ limit: -1 })).toThrow(TypeError);
      }
    });

    it('should use the default for a null limit, as body-parser does', async () => {
      const { status } = await send(json({ limit: null as any }), {
        headers: JSON_TYPE,
        body: JSON.stringify({ data: 'x'.repeat(100 * 1024) }),
      });

      expect(status).toBe(413);
    });
  });

  describe('inflate', () => {
    it.each([
      ['gzip', gzipSync],
      ['deflate', deflateSync],
      ['br', brotliCompressSync],
    ])('should decompress a %s body', async (encoding, compress) => {
      const { status, req } = await send(json(), {
        headers: { ...JSON_TYPE, 'content-encoding': encoding },
        body: compress('{"name":"nest"}'),
      });

      expect(status).toBe(200);
      expect(req.body).toEqual({ name: 'nest' });
    });

    it('should reject an encoded body with 415 when inflate is false', async () => {
      const { status, error } = await send(json({ inflate: false }), {
        headers: { ...JSON_TYPE, 'content-encoding': 'gzip' },
        body: gzipSync('{"name":"nest"}'),
      });

      expect(status).toBe(415);
      expectHttpError(error, 415, 'encoding.unsupported');
      expect(error.encoding).toBe('gzip');
    });

    it('should reject an unsupported content encoding with 415', async () => {
      const { status, error } = await send(json(), {
        headers: { ...JSON_TYPE, 'content-encoding': 'compress' },
        body: 'compressed',
      });

      expect(status).toBe(415);
      expectHttpError(error, 415, 'encoding.unsupported');
      expect(error.encoding).toBe('compress');
    });

    it.each([
      ['not gzip at all', Buffer.from('not gzip at all')],
      ['truncated', gzipSync('{"name":"nest"}').subarray(0, 12)],
    ])(
      'should reject a corrupt (%s) gzip body with 400 and keep serving',
      async (_, body) => {
        const request = await startServer(json());

        const corrupt = await request({
          headers: { ...JSON_TYPE, 'content-encoding': 'gzip' },
          body,
        });
        const valid = await request({
          headers: { ...JSON_TYPE, 'content-encoding': 'gzip' },
          body: gzipSync('{"name":"nest"}'),
        });

        expect(corrupt.status).toBe(400);
        expectHttpError(corrupt.error, 400, 'stream.error');
        expect(valid.status).toBe(200);
        expect(valid.req.body).toEqual({ name: 'nest' });
      },
    );
  });

  describe('charset', () => {
    it('should decode utf-8 by default', async () => {
      const { req } = await send(json(), {
        headers: JSON_TYPE,
        body: Buffer.from('{"name":"nést 🚀"}', 'utf8'),
      });

      expect(req.body).toEqual({ name: 'nést 🚀' });
    });

    it.each([
      ['json', json, 'application/json; charset=iso-8859-1', 'iso-8859-1'],
      [
        'urlencoded',
        urlencoded,
        'application/x-www-form-urlencoded; charset=utf-16',
        'utf-16',
      ],
      ['text', text, 'text/plain; charset=x-unknown', 'x-unknown'],
    ])(
      'should reject an unsupported charset with 415 (%s)',
      async (_, parser, contentType, charset) => {
        const { status, error } = await send(parser(), {
          headers: { 'content-type': contentType },
          body: 'a=1',
        });

        expect(status).toBe(415);
        expectHttpError(error, 415, 'charset.unsupported');
        expect(error.charset).toBe(charset);
      },
    );

    it('should read a quoted charset parameter', async () => {
      const { req } = await send(text(), {
        headers: { 'content-type': 'text/plain; charset="ISO-8859-1"' },
        body: Buffer.from('café', 'latin1'),
      });

      expect(req.body).toBe('café');
    });

    it('should not take a "charset=" inside another quoted parameter for the charset', async () => {
      const { req } = await send(text(), {
        headers: { 'content-type': 'text/plain; foo="bar; charset=utf-16le"' },
        body: Buffer.from('héllo', 'utf8'),
      });

      expect(req.body).toBe('héllo');
    });
  });

  describe('verify', () => {
    it('should receive the exact raw bytes and the charset', async () => {
      const verify = vi.fn();
      const chunks = ['{ "name" :', ' "nést" }\n'];

      const { req } = await send(json({ verify }), {
        headers: JSON_TYPE,
        body: chunks,
      });

      expect(verify).toHaveBeenCalledExactlyOnceWith(
        req,
        expect.any(ServerResponse),
        Buffer.from(chunks.join(''), 'utf8'),
        'utf-8',
      );
      expect(req.body).toEqual({ name: 'nést' });
    });

    it('should reject the request with 403 when it throws', async () => {
      const verify = () => {
        throw new Error('invalid signature');
      };

      const { status, error, req } = await send(json({ verify }), {
        headers: JSON_TYPE,
        body: '{"name":"nest"}',
      });

      expect(status).toBe(403);
      expectHttpError(error, 403, 'entity.verify.failed');
      expect(error.message).toBe('invalid signature');
      expect(req.body).toBeUndefined();
    });

    it('should keep the status of an error that carries one', async () => {
      const verify = () => {
        throw Object.assign(new Error('signature expired'), { status: 401 });
      };

      const { status, error } = await send(json({ verify }), {
        headers: JSON_TYPE,
        body: '{}',
      });

      expect(status).toBe(401);
      expectHttpError(error, 401, 'entity.verify.failed');
    });

    it('should not change the status of a thrown HttpException', async () => {
      const exception = new UnauthorizedException('invalid signature');
      const verify = () => {
        throw exception;
      };

      const { status, error } = await send(json({ verify }), {
        headers: JSON_TYPE,
        body: '{}',
      });

      expect(status).toBe(401);
      expect(error).toBe(exception);
      expect(exception.getStatus()).toBe(401);
    });

    it.each([
      ['an identity', {}, (body: string) => body],
      ['a gzip', { 'content-encoding': 'gzip' }, gzipSync],
    ])(
      'should let the rawBody verifier keep the bytes of %s body',
      async (_, headers, encode) => {
        // The adapter's "rawBody" option stores the buffer on the request
        const verify = (req: ParsedRequest, _res: unknown, buffer: Buffer) => {
          req.rawBody = buffer;
        };
        const body = '{ "name": "nést",\n  "list": [1, 2] }';

        const { req } = await send(json({ verify }), {
          headers: { ...JSON_TYPE, ...headers },
          body: encode(body),
        });

        expect(req.rawBody).toEqual(Buffer.from(body, 'utf8'));
        expect(req.body).toEqual({ name: 'nést', list: [1, 2] });
      },
    );
  });

  describe('prototype poisoning', () => {
    describe('json', () => {
      it.each([
        ['a "__proto__" key', '{"name":"nest","__proto__":{"polluted":true}}'],
        [
          'a unicode-escaped "__proto__" key',
          '{"\\u005f_proto__":{"polluted":true}}',
        ],
        [
          'a nested "constructor.prototype" path',
          '{"a":{"constructor":{"prototype":{"polluted":true}}}}',
        ],
      ])('should reject %s with 400 by default', async (_, body) => {
        const { status, error, req } = await send(json(), {
          headers: JSON_TYPE,
          body,
        });

        expect(status).toBe(400);
        expect(error).toBeInstanceOf(SyntaxError);
        expectHttpError(error, 400, 'entity.parse.failed');
        expect(req.body).toBeUndefined();
        expect(({} as any).polluted).toBeUndefined();
      });

      it('should accept a "constructor" key without a "prototype"', async () => {
        const { status, req } = await send(json(), {
          headers: JSON_TYPE,
          body: '{"constructor":{"name":"nest"}}',
        });

        expect(status).toBe(200);
        expect(req.body.constructor).toEqual({ name: 'nest' });
      });

      it('should drop the offending keys with "remove"', async () => {
        const parser = json({
          onProtoPoisoning: 'remove',
          onConstructorPoisoning: 'remove',
        });

        const { status, req } = await send(parser, {
          headers: JSON_TYPE,
          body: '{"name":"nest","__proto__":{"polluted":true},"a":{"constructor":{"prototype":{"polluted":true}}}}',
        });

        expect(status).toBe(200);
        expect(req.body).toEqual({ name: 'nest', a: {} });
        expect(Object.hasOwn(req.body, '__proto__')).toBe(false);
        expect(Object.hasOwn(req.body.a, 'constructor')).toBe(false);
        expect(({} as any).polluted).toBeUndefined();
      });

      it('should keep the plain JSON.parse() result with "ignore"', async () => {
        const parser = json({
          onProtoPoisoning: 'ignore',
          onConstructorPoisoning: 'ignore',
        });

        const { status, req } = await send(parser, {
          headers: JSON_TYPE,
          body: '{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}}}',
        });

        expect(status).toBe(200);
        expect(Object.hasOwn(req.body, '__proto__')).toBe(true);
        expect(Object.getPrototypeOf(req.body)).toBe(Object.prototype);
        expect(req.body.constructor).toEqual({
          prototype: { polluted: true },
        });
        expect(({} as any).polluted).toBeUndefined();
      });
    });

    describe('urlencoded (extended)', () => {
      it.each([
        'constructor[prototype][polluted]=yes',
        'a[b][constructor][prototype][polluted]=yes',
      ])('should reject "%s" with 400 by default', async body => {
        const { status, error, req } = await send(
          urlencoded({ extended: true }),
          { headers: FORM_TYPE, body },
        );

        expect(status).toBe(400);
        expectHttpError(error, 400, 'entity.parse.failed');
        expect(req.body).toBeUndefined();
        expect(({} as any).polluted).toBeUndefined();
      });

      it('should drop a "constructor[prototype]" key with "remove"', async () => {
        const parser = urlencoded({
          extended: true,
          onConstructorPoisoning: 'remove',
        });

        const { status, req } = await send(parser, {
          headers: FORM_TYPE,
          body: 'name=nest&constructor[prototype][polluted]=yes',
        });

        expect(status).toBe(200);
        expect(req.body).toEqual({ name: 'nest' });
        expect(Object.hasOwn(req.body, 'constructor')).toBe(false);
      });

      it('should keep a "constructor[prototype]" key as plain data with "ignore"', async () => {
        const parser = urlencoded({
          extended: true,
          onProtoPoisoning: 'ignore',
          onConstructorPoisoning: 'ignore',
        });

        const { status, req } = await send(parser, {
          headers: FORM_TYPE,
          body: 'constructor[prototype][polluted]=yes',
        });

        expect(status).toBe(200);
        expect(req.body.constructor).toEqual({
          prototype: { polluted: 'yes' },
        });
        expect(Object.getPrototypeOf(req.body)).toBe(Object.prototype);
        expect(({} as any).polluted).toBeUndefined();
      });

      it.each([
        '__proto__[polluted]=yes',
        'a[__proto__][polluted]=yes',
        '%5F%5Fproto%5F%5F[polluted]=yes',
      ])('should reject "%s" with 400 by default', async body => {
        const { status, error, req } = await send(
          urlencoded({ extended: true }),
          { headers: FORM_TYPE, body },
        );

        expect(status).toBe(400);
        expectHttpError(error, 400, 'entity.parse.failed');
        expect(req.body).toBeUndefined();
      });

      it.each(['remove', 'ignore'] as const)(
        'should drop a "__proto__" key with "%s", as qs does',
        async onProtoPoisoning => {
          const { status, req } = await send(
            urlencoded({ extended: true, onProtoPoisoning }),
            { headers: FORM_TYPE, body: 'name=nest&__proto__[polluted]=yes' },
          );

          expect(status).toBe(200);
          expect(req.body).toEqual({ name: 'nest' });
        },
      );

      it('should reject a "__proto__" key with 400 by default without extended', async () => {
        const { status, error } = await send(urlencoded(), {
          headers: FORM_TYPE,
          body: 'name=nest&__proto__=yes',
        });

        expect(status).toBe(400);
        expectHttpError(error, 400, 'entity.parse.failed');
      });

      it.each(['error', 'remove', 'ignore'] as const)(
        'should never let a "__proto__" key pollute Object.prototype (%s)',
        async action => {
          const parser = urlencoded({
            extended: true,
            onProtoPoisoning: action,
            onConstructorPoisoning: action,
          });

          await send(parser, {
            headers: FORM_TYPE,
            body: '__proto__[polluted]=yes&a[__proto__][polluted]=yes',
          });

          expect(({} as any).polluted).toBeUndefined();
          expect(Object.prototype).not.toHaveProperty('polluted');
        },
      );
    });
  });

  describe('urlencoded', () => {
    it.each([0, -1, NaN])(
      'should throw for a parameterLimit of %s, as body-parser does',
      parameterLimit => {
        expect(() => urlencoded({ parameterLimit })).toThrow(TypeError);
      },
    );

    it.each([-1, NaN])(
      'should throw for a depth of %s, as body-parser does',
      depth => {
        expect(() => urlencoded({ extended: true, depth })).toThrow(TypeError);
      },
    );

    it('should parse flat keys by default', async () => {
      const { req } = await send(urlencoded(), {
        headers: FORM_TYPE,
        body: 'name=nest&a[b]=c',
      });

      expect(req.body).toEqual({ name: 'nest', 'a[b]': 'c' });
    });

    it('should parse nested objects and arrays with extended: true', async () => {
      const { req } = await send(urlencoded({ extended: true }), {
        headers: FORM_TYPE,
        body: 'name=nest&a[b]=c&list[]=1&list[]=2',
      });

      expect(req.body).toEqual({
        name: 'nest',
        a: { b: 'c' },
        list: ['1', '2'],
      });
    });

    it('should decode an iso-8859-1 body', async () => {
      const { req } = await send(urlencoded(), {
        headers: {
          'content-type':
            'application/x-www-form-urlencoded; charset=iso-8859-1',
        },
        body: 'name=caf%E9',
      });

      expect(req.body).toEqual({ name: 'café' });
    });

    it('should reject more parameters than parameterLimit with 413', async () => {
      const request = await startServer(urlencoded({ parameterLimit: 2 }));

      const atLimit = await request({ headers: FORM_TYPE, body: 'a=1&b=2' });
      const overLimit = await request({
        headers: FORM_TYPE,
        body: 'a=1&b=2&c=3',
      });

      expect(atLimit.req.body).toEqual({ a: '1', b: '2' });
      expect(overLimit.status).toBe(413);
      expectHttpError(overLimit.error, 413, 'parameters.too.many');
    });

    it('should default parameterLimit to 1000', async () => {
      const params = (count: number) =>
        Array.from({ length: count }, (_, i) => `p${i}=${i}`).join('&');
      const request = await startServer(urlencoded());

      const atLimit = await request({ headers: FORM_TYPE, body: params(1000) });
      const overLimit = await request({
        headers: FORM_TYPE,
        body: params(1001),
      });

      expect(Object.keys(atLimit.req.body)).toHaveLength(1000);
      expect(overLimit.status).toBe(413);
    });

    it('should reject nesting deeper than depth with 400', async () => {
      const request = await startServer(
        urlencoded({ extended: true, depth: 1 }),
      );

      const atDepth = await request({ headers: FORM_TYPE, body: 'a[b]=1' });
      const tooDeep = await request({ headers: FORM_TYPE, body: 'a[b][c]=1' });

      expect(atDepth.req.body).toEqual({ a: { b: '1' } });
      expect(tooDeep.status).toBe(400);
      expectHttpError(tooDeep.error, 400, 'querystring.parse.rangeError');
    });

    it('should default depth to 32', async () => {
      const request = await startServer(urlencoded({ extended: true }));

      const atDepth = await request({
        headers: FORM_TYPE,
        body: `a${'[b]'.repeat(32)}=1`,
      });
      const tooDeep = await request({
        headers: FORM_TYPE,
        body: `a${'[b]'.repeat(33)}=1`,
      });

      expect(atDepth.status).toBe(200);
      expect(tooDeep.status).toBe(400);
    });
  });

  describe('text', () => {
    it('should drop a UTF-8 byte order mark', async () => {
      const { req } = await send(text(), {
        headers: TEXT_TYPE,
        body: '\uFEFFhello',
      });

      expect(req.body).toBe('hello');
    });

    it('should read a text/plain body into a string', async () => {
      const { req } = await send(text(), {
        headers: TEXT_TYPE,
        body: Buffer.from('héllo', 'utf8'),
      });

      expect(req.body).toBe('héllo');
    });

    it('should skip other media types by default', async () => {
      const { req } = await send(text(), {
        headers: { 'content-type': 'text/html' },
        body: '<p>hello</p>',
      });

      expect(req.body).toBeUndefined();
    });

    it.each([
      ['latin1', Buffer.from('café', 'latin1'), 'café'],
      ['windows-1252', Buffer.from([0x80, 0x20, 0x35]), '€ 5'],
    ])('should decode the %s charset', async (charset, body, expected) => {
      const { req } = await send(text(), {
        headers: { 'content-type': `text/plain; charset=${charset}` },
        body,
      });

      expect(req.body).toBe(expected);
    });

    it('should fall back to defaultCharset', async () => {
      const { req } = await send(text({ defaultCharset: 'latin1' }), {
        headers: TEXT_TYPE,
        body: Buffer.from('café', 'latin1'),
      });

      expect(req.body).toBe('café');
    });
  });

  describe('raw', () => {
    it('should read an application/octet-stream body into a Buffer', async () => {
      const bytes = Buffer.from([0x00, 0x01, 0xfe, 0xff]);

      const { req } = await send(raw(), { headers: BINARY_TYPE, body: bytes });

      expect(Buffer.isBuffer(req.body)).toBe(true);
      expect(req.body).toEqual(bytes);
    });

    it('should skip other media types by default', async () => {
      const { req } = await send(raw(), { headers: TEXT_TYPE, body: 'hello' });

      expect(req.body).toBeUndefined();
    });
  });

  describe('when the client aborts mid-body', () => {
    /**
     * Sends the headers and part of the body over a raw socket, then destroys
     * it once the parser is reading the request.
     */
    async function abortMidBody(
      parser: Middleware,
      headers: string[],
      partialBody: Buffer,
    ) {
      let resolveNext!: (error: any) => void;
      const nextCalled = new Promise<any>(resolve => (resolveNext = resolve));
      const next = vi.fn((error?: any) => resolveNext(error));
      let resolveRequest!: (req: IncomingMessage) => void;
      const requestReceived = new Promise<IncomingMessage>(
        resolve => (resolveRequest = resolve),
      );
      const server = http.createServer((req, res) => {
        parser(req, res, next);
        resolveRequest(req);
      });
      const port = await listen(server);

      const socket = connect(port, '127.0.0.1');
      await once(socket, 'connect');
      socket.write(
        ['POST / HTTP/1.1', 'Host: 127.0.0.1', ...headers, '', ''].join('\r\n'),
      );
      socket.write(partialBody);
      const req = await requestReceived;
      socket.destroy();

      const error = await nextCalled;
      // Let any late "error"/"close" events of the request fire
      if (!req.destroyed) {
        await once(req, 'close');
      }
      await new Promise(resolve => setImmediate(resolve));
      return { error, next };
    }

    it('should call next() exactly once with a 400 error for an identity body', async () => {
      const { error, next } = await abortMidBody(
        json(),
        ['Content-Type: application/json', 'Content-Length: 100'],
        Buffer.from('{"name":'),
      );

      expect(next).toHaveBeenCalledTimes(1);
      expect(error).toMatchObject({
        status: 400,
        statusCode: 400,
        type: 'request.aborted',
      });
    });

    it('should call next() exactly once with a 400 error for a gzip body', async () => {
      const compressed = gzipSync(JSON.stringify({ name: 'x'.repeat(4096) }), {
        level: 0,
      });

      const { error, next } = await abortMidBody(
        json(),
        [
          'Content-Type: application/json',
          'Content-Encoding: gzip',
          `Content-Length: ${compressed.length}`,
        ],
        compressed.subarray(0, 64),
      );

      expect(next).toHaveBeenCalledTimes(1);
      expect(error).toMatchObject({
        status: 400,
        statusCode: 400,
        type: 'request.aborted',
      });
    });

    it('should call next() without an error when the client is already gone', async () => {
      // As when an asynchronous middleware runs before the parser
      let resolveNext!: (error: any) => void;
      const nextCalled = new Promise<any>(resolve => (resolveNext = resolve));
      const next = vi.fn((error?: any) => resolveNext(error));
      let resolveRequest!: () => void;
      const requestReceived = new Promise<void>(
        resolve => (resolveRequest = resolve),
      );
      const server = http.createServer((req, res) => {
        req.once('close', () => setImmediate(() => json()(req, res, next)));
        resolveRequest();
      });
      const port = await listen(server);

      const socket = connect(port, '127.0.0.1');
      await once(socket, 'connect');
      socket.write(
        [
          'POST / HTTP/1.1',
          'Host: 127.0.0.1',
          'Content-Type: application/json',
          'Content-Length: 100',
          '',
          '{"name":',
        ].join('\r\n'),
      );
      await requestReceived;
      socket.destroy();

      const error = await nextCalled;
      await new Promise(resolve => setImmediate(resolve));
      expect(next).toHaveBeenCalledTimes(1);
      expect(error).toBeUndefined();
    });
  });
});
