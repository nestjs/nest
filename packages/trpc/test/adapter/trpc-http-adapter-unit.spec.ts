import { expect } from 'chai';
import * as sinon from 'sinon';
import { initTRPC } from '@trpc/server';
import { TrpcHttpAdapter } from '../../trpc-http-adapter';
import { TrpcRouter } from '../../trpc-router';

/**
 * Unit tests exercising the response-object fallback chains
 * inside TrpcHttpAdapter's handler function.
 *
 * The integration tests always use Express (which provides res.setHeader + res.send)
 * or Fastify (which provides res.raw). These unit tests cover the remaining fallback
 * branches: res.header(), res.raw.setHeader(), res.end(), and res.raw.end().
 */
describe('TrpcHttpAdapter (unit – response fallbacks)', () => {
  let trpcRouter: any;
  let options: any;
  let httpAdapter: any;

  beforeEach(() => {
    const t = initTRPC.context<any>().create();
    const appRouter = t.router({
      hello: t.procedure.query(() => 'world'),
    });

    trpcRouter = { getRouter: sinon.stub().returns(appRouter) };
    options = { path: '/trpc' };
    httpAdapter = { httpAdapter: { getInstance: () => ({}) } };
  });

  afterEach(() => sinon.restore());

  function createAdapter(): TrpcHttpAdapter {
    return new TrpcHttpAdapter(httpAdapter, trpcRouter as TrpcRouter, options);
  }

  function makeGetRequest(url = '/trpc/hello?input=%7B%7D') {
    return {
      method: 'GET',
      protocol: 'http',
      headers: { host: 'localhost' },
      originalUrl: url,
      body: undefined,
    };
  }

  it('should fall back to res.header() when res.setHeader is missing', done => {
    const headerSpy = sinon.spy();
    const sendSpy = sinon.spy((payload: string) => {
      const parsed = JSON.parse(payload);
      expect(parsed.result.data).to.equal('world');
      expect(headerSpy.called).to.be.true;
      done();
    });

    httpAdapter.httpAdapter.getInstance = () => ({
      use: (_path: string, handler: any) => {
        handler(makeGetRequest(), { header: headerSpy, send: sendSpy });
      },
    });

    createAdapter().onModuleInit();
  });

  it('should fall back to res.raw.setHeader() when both setHeader and header are missing', done => {
    const rawSetHeader = sinon.spy();
    const rawEnd = sinon.spy((payload: string) => {
      const parsed = JSON.parse(payload);
      expect(parsed.result.data).to.equal('world');
      expect(rawSetHeader.called).to.be.true;
      done();
    });

    httpAdapter.httpAdapter.getInstance = () => ({
      use: (_path: string, handler: any) => {
        handler(makeGetRequest(), {
          raw: { setHeader: rawSetHeader, end: rawEnd },
        });
      },
    });

    createAdapter().onModuleInit();
  });

  it('should fall back to res.end() when res.send is missing', done => {
    const endSpy = sinon.spy((payload: string) => {
      const parsed = JSON.parse(payload);
      expect(parsed.result.data).to.equal('world');
      done();
    });

    httpAdapter.httpAdapter.getInstance = () => ({
      use: (_path: string, handler: any) => {
        handler(makeGetRequest(), { setHeader: sinon.spy(), end: endSpy });
      },
    });

    createAdapter().onModuleInit();
  });

  it('should fall back to res.raw.end() when both send and end are missing', done => {
    const rawEnd = sinon.spy((payload: string) => {
      const parsed = JSON.parse(payload);
      expect(parsed.result.data).to.equal('world');
      done();
    });

    httpAdapter.httpAdapter.getInstance = () => ({
      use: (_path: string, handler: any) => {
        handler(makeGetRequest(), {
          setHeader: sinon.spy(),
          raw: { end: rawEnd },
        });
      },
    });

    createAdapter().onModuleInit();
  });

  it('should derive https protocol from req.raw.socket.encrypted', done => {
    httpAdapter.httpAdapter.getInstance = () => ({
      use: (_path: string, handler: any) => {
        const req = {
          method: 'GET',
          raw: { socket: { encrypted: true } },
          headers: { host: 'example.com' },
          url: '/trpc/hello?input=%7B%7D',
        };
        const res = {
          setHeader: sinon.spy(),
          send: sinon.spy((payload: string) => {
            const parsed = JSON.parse(payload);
            expect(parsed.result.data).to.equal('world');
            done();
          }),
        };
        handler(req, res);
      },
    });

    createAdapter().onModuleInit();
  });

  it('should register via Fastify route() when use() is absent', done => {
    const methods: string[] = [];
    httpAdapter.httpAdapter.getInstance = () => ({
      route: (opts: any) => {
        expect(opts.url).to.equal('/trpc/*');
        expect(opts.handler).to.be.a('function');
        methods.push(opts.method);
        if (methods.length === 2) {
          expect(methods).to.deep.equal(['GET', 'POST']);
          done();
        }
      },
    });

    createAdapter().onModuleInit();
  });

  it('should fall back to localhost when hostname and host header are absent', done => {
    httpAdapter.httpAdapter.getInstance = () => ({
      use: (_path: string, handler: any) => {
        const req = {
          method: 'GET',
          protocol: 'http',
          headers: {},
          originalUrl: '/trpc/hello?input=%7B%7D',
        };
        const res = {
          setHeader: sinon.spy(),
          send: sinon.spy((payload: string) => {
            const parsed = JSON.parse(payload);
            expect(parsed.result.data).to.equal('world');
            done();
          }),
        };
        handler(req, res);
      },
    });

    createAdapter().onModuleInit();
  });

  it('should use req.hostname when available', done => {
    httpAdapter.httpAdapter.getInstance = () => ({
      use: (_path: string, handler: any) => {
        const req = {
          method: 'GET',
          protocol: 'http',
          hostname: 'myhost.local',
          headers: {},
          originalUrl: '/trpc/hello?input=%7B%7D',
        };
        const res = {
          setHeader: sinon.spy(),
          send: sinon.spy((payload: string) => {
            const parsed = JSON.parse(payload);
            expect(parsed.result.data).to.equal('world');
            done();
          }),
        };
        handler(req, res);
      },
    });

    createAdapter().onModuleInit();
  });

  it('should fall back to all defaults when protocol, hostname, and host are absent', done => {
    httpAdapter.httpAdapter.getInstance = () => ({
      use: (_path: string, handler: any) => {
        // No protocol, no hostname, no host header, use url instead of originalUrl
        const req = {
          method: 'GET',
          headers: {},
          url: '/trpc/hello?input=%7B%7D',
        };
        const res = {
          setHeader: sinon.spy(),
          send: sinon.spy((payload: string) => {
            const parsed = JSON.parse(payload);
            expect(parsed.result.data).to.equal('world');
            done();
          }),
        };
        handler(req, res);
      },
    });

    createAdapter().onModuleInit();
  });

  it('should do nothing when httpAdapter is falsy', () => {
    httpAdapter.httpAdapter = undefined as any;
    // Should not throw
    createAdapter().onModuleInit();
  });
});
