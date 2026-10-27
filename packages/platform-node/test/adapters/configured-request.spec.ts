import * as http from 'http';
import type { AddressInfo } from 'net';
import { createRequestClass } from '../../adapters/configured-request.js';
import { NodeRequest, NodeResponse } from '../../adapters/node-request.js';
import type { NodeAdapterOptions } from '../../interfaces/node-adapter-options.interface.js';

let server: http.Server | undefined;

afterEach(async () => {
  if (!server) {
    return;
  }
  const closing = server;
  server = undefined;
  closing.closeAllConnections();
  await new Promise(resolve => closing.close(resolve));
});

/**
 * Sends one request (from 127.0.0.1) to a server whose requests are of the
 * class `options` give, and returns what `read` returned for it.
 */
async function inspect<T>(
  options: NodeAdapterOptions,
  read: (req: NodeRequest) => T,
  requestOptions: http.RequestOptions = {},
): Promise<T> {
  let result: { value: T } | undefined;
  server = http.createServer(
    {
      IncomingMessage: createRequestClass(options),
      ServerResponse: NodeResponse,
    } as http.ServerOptions<typeof NodeRequest, typeof NodeResponse>,
    (req, res) => {
      result = { value: read(req as NodeRequest) };
      res.end();
    },
  );
  await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  await new Promise<void>((resolve, reject) =>
    http
      .request(
        { host: '127.0.0.1', port, agent: false, ...requestOptions },
        res => res.resume().on('end', resolve),
      )
      .on('error', reject)
      .end(),
  );
  // Otherwise a test expecting "undefined" would pass without running
  if (!result) {
    throw new Error('No handler ran');
  }
  return result.value;
}

// A request that reached the app (127.0.0.1) through a proxy at 10.0.0.2
// from the client 203.0.113.7
const FORWARDED = {
  headers: {
    host: 'internal:3000',
    'x-forwarded-for': '203.0.113.7, 10.0.0.2',
    'x-forwarded-proto': 'https',
    'x-forwarded-host': 'example.com:8443',
  },
};

const describeRequest = (req: NodeRequest) => ({
  ip: req.ip,
  ips: req.ips,
  protocol: req.protocol,
  secure: req.secure,
  hostname: req.hostname,
});

describe('createRequestClass', () => {
  it('should return NodeRequest itself without options that change requests', () => {
    expect(createRequestClass({})).toBe(NodeRequest);
    expect(createRequestClass({ maxParamLength: 50, trustProxy: false })).toBe(
      NodeRequest,
    );
  });

  describe('trustProxy', () => {
    it.each([
      ['an array of addresses and subnets', ['loopback', '10.0.0.0/8']],
      ['a comma-separated string', 'loopback, 10.0.0.0/8'],
      ['true', true],
    ])(
      'should read the X-Forwarded-* headers of trusted proxies (%s), as Express does',
      async (_, trustProxy) => {
        expect(
          await inspect({ trustProxy }, describeRequest, FORWARDED),
        ).toEqual({
          ip: '203.0.113.7',
          // From the client to the closest proxy, as with Express
          ips: ['203.0.113.7', '10.0.0.2'],
          protocol: 'https',
          secure: true,
          hostname: 'example.com',
        });
      },
    );

    it.each([
      ['a subnet that leaves the proxy out', 'loopback'],
      ['a hop count, as with Express', 1],
      [
        'a function',
        (address: string, hop: number) => hop === 0 && address === '127.0.0.1',
      ],
    ])(
      'should stop at the first address that is not trusted (%s)',
      async (_, trustProxy) => {
        expect(
          await inspect({ trustProxy }, describeRequest, FORWARDED),
        ).toEqual({
          ip: '10.0.0.2',
          ips: ['10.0.0.2'],
          protocol: 'https',
          secure: true,
          hostname: 'example.com',
        });
      },
    );

    it('should ignore the headers when the socket peer is not a trusted proxy', async () => {
      expect(
        await inspect({ trustProxy: '10.0.0.1' }, describeRequest, FORWARDED),
      ).toEqual({
        ip: '127.0.0.1',
        ips: [],
        protocol: 'http',
        secure: false,
        hostname: 'internal',
      });
    });

    it('should read the first of several X-Forwarded-Proto and X-Forwarded-Host values, as Express does', async () => {
      const observed = await inspect(
        { trustProxy: true },
        req => [req.protocol, req.hostname],
        {
          headers: {
            'x-forwarded-proto': 'https, http',
            'x-forwarded-host': 'example.com, internal',
          },
        },
      );

      expect(observed).toEqual(['https', 'example.com']);
    });

    it('should fall back to the socket and the Host header without X-Forwarded-* headers', async () => {
      const observed = await inspect({ trustProxy: true }, describeRequest, {
        headers: { host: 'example.com:3000' },
      });

      expect(observed).toEqual({
        ip: '127.0.0.1',
        ips: [],
        protocol: 'http',
        secure: false,
        hostname: 'example.com',
      });
    });

    it("should report the setting through req.app, as Express' settings", async () => {
      const trustProxy = ['loopback'];
      const [setting, compiled, other] = await inspect({ trustProxy }, req => [
        req.app.get('trust proxy'),
        req.app.get('trust proxy fn'),
        req.app.get('env'),
      ]);

      expect(setting).toBe(trustProxy);
      expect(compiled).toBeTypeOf('function');
      expect(other).toBeUndefined();
    });

    it('should throw for an address that is not an IP address', () => {
      expect(() => createRequestClass({ trustProxy: 'proxy.local' })).toThrow(
        TypeError,
      );
    });
  });

  describe('querystringParser', () => {
    it('should parse the query string with the given parser, as Fastify does', async () => {
      const querystringParser = vi.fn((str: string) => ({ parsed: str }));

      const withQuery = await inspect({ querystringParser }, req => req.query, {
        path: '/?a[b]=1&c=2',
      });
      // Fastify calls the parser for a URL without a query string as well
      const withoutQuery = await inspect(
        { querystringParser },
        req => req.query,
      );

      expect(withQuery).toEqual({ parsed: 'a[b]=1&c=2' });
      expect(withoutQuery).toEqual({ parsed: '' });
    });

    it('should parse the query string once, and let req.query be replaced', async () => {
      const querystringParser = vi.fn(() => ({ parsed: true }));

      const observed = await inspect(
        { querystringParser },
        req => {
          const first = req.query;
          const second = req.query;
          req.query = { replaced: true };
          return [first === second, req.query];
        },
        { path: '/?a=1' },
      );

      expect(observed).toEqual([true, { replaced: true }]);
      expect(querystringParser).toHaveBeenCalledOnce();
    });

    it('should throw for a querystringParser that is not a function', () => {
      expect(() =>
        createRequestClass({ querystringParser: 'qs' as any }),
      ).toThrow(TypeError);
    });
  });

  it('should apply both options together', async () => {
    const observed = await inspect(
      { trustProxy: true, querystringParser: str => ({ raw: str }) },
      req => [req.ip, req.query],
      { path: '/?a=1', headers: { 'x-forwarded-for': '203.0.113.7' } },
    );

    expect(observed).toEqual(['203.0.113.7', { raw: 'a=1' }]);
  });
});
