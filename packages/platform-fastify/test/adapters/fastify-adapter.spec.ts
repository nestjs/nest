import { RequestMethod } from '@nestjs/common';
import { expect } from 'chai';
import { FastifyRequest, fastify } from 'fastify';
import { inject } from 'light-my-request';
import * as sinon from 'sinon';
import { FastifyAdapter } from '../../adapters/fastify-adapter';

describe('FastifyAdapter', () => {
  let fastifyAdapter: FastifyAdapter;

  beforeEach(() => {
    fastifyAdapter = new FastifyAdapter();
  });

  afterEach(() => sinon.restore());

  describe('getRouteMatchingOptions', () => {
    for (const { source, createAdapter, expected } of [
      {
        source: 'the defaults',
        createAdapter: () => new FastifyAdapter(),
        expected: { caseSensitive: true, ignoreTrailingSlash: false },
      },
      {
        source: '"routerOptions"',
        createAdapter: () =>
          new FastifyAdapter({
            routerOptions: { caseSensitive: false, ignoreTrailingSlash: true },
          }),
        expected: { caseSensitive: false, ignoreTrailingSlash: true },
      },
      {
        source: 'the top-level router options',
        createAdapter: () =>
          new FastifyAdapter({
            caseSensitive: false,
            ignoreTrailingSlash: true,
          }),
        expected: { caseSensitive: false, ignoreTrailingSlash: true },
      },
      {
        source: 'an instance created without "routerOptions"',
        createAdapter: () => new FastifyAdapter(fastify()),
        expected: { caseSensitive: true, ignoreTrailingSlash: false },
      },
      {
        source: 'the top-level router options of an instance',
        createAdapter: () =>
          new FastifyAdapter(
            fastify({ caseSensitive: false, ignoreTrailingSlash: true }),
          ),
        expected: { caseSensitive: false, ignoreTrailingSlash: true },
      },
    ]) {
      it(`should follow ${source}`, () => {
        expect(createAdapter().getRouteMatchingOptions()).to.deep.equal(
          expected,
        );
      });
    }
  });

  describe('createMiddlewareFactory', () => {
    it('should run middleware on an instance created without "routerOptions"', async () => {
      const adapter = new FastifyAdapter(fastify());
      const middleware = sinon.spy((_req, _res, next: Function) => next());
      const register = await adapter.createMiddlewareFactory(RequestMethod.ALL);
      register('/cats', middleware);
      adapter.get('/cats', () => 'cats');

      const res = await adapter.inject({ method: 'GET', url: '/cats' });

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.equal('cats');
      expect(middleware.calledOnce).to.be.true;
      await adapter.close();
    });
  });

  describe('empty route parameters', () => {
    beforeEach(() => {
      fastifyAdapter.setNotFoundHandler((_req, reply) =>
        reply.code(404).send('not found'),
      );
    });

    afterEach(async () => {
      await fastifyAdapter.close();
    });

    for (const [path, url] of [
      ['/users/:id/profile', '/users//profile'],
      ['/users/:id', '/users/'],
      ['/ranges/:from-:to', '/ranges/-b'],
      ['/ranges/:from-:to', '/ranges/a-'],
    ]) {
      it(`should pass a request for "${path}" with an empty parameter (${url}) to the not-found handler`, async () => {
        const handler = sinon.spy(() => 'found');
        fastifyAdapter.get(path, handler);

        const res = await fastifyAdapter.inject({ method: 'GET', url });

        expect(res.statusCode).to.equal(404);
        expect(res.body).to.equal('not found');
        expect(handler.called).to.be.false;
      });
    }

    it('should call the handler when every route parameter has a value', async () => {
      const handler = sinon.spy((req: FastifyRequest) => req.params);
      fastifyAdapter.get('/ranges/:from-:to', handler);

      const res = await fastifyAdapter.inject({
        method: 'GET',
        url: '/ranges/a-b',
      });

      expect(res.statusCode).to.equal(200);
      expect(JSON.parse(res.body)).to.deep.equal({ from: 'a', to: 'b' });
      expect(handler.calledOnce).to.be.true;
    });

    it('should call the handler for an empty wildcard', async () => {
      const handler = sinon.spy(() => 'found');
      fastifyAdapter.get('/files/*', handler);

      const res = await fastifyAdapter.inject({
        method: 'GET',
        url: '/files/',
      });

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.equal('found');
    });

    it('should pass a request with an empty parameter to the not-found handler for routes registered with all()', async () => {
      const handler = sinon.spy(() => 'found');
      fastifyAdapter.all('/actions/:id/run', handler);

      for (const method of ['GET', 'POST'] as const) {
        const res = await fastifyAdapter.inject({
          method,
          url: '/actions//run',
        });
        expect(res.statusCode).to.equal(404);
      }
      expect(handler.called).to.be.false;

      const res = await fastifyAdapter.inject({
        method: 'POST',
        url: '/actions/1/run',
      });
      expect(res.body).to.equal('found');
    });

    it('should keep the name of the route handler', () => {
      const names: string[] = [];
      fastifyAdapter.getInstance().addHook('onRoute', route => {
        names.push(route.handler.name);
      });
      const handler = () => 'found';
      Object.defineProperty(handler, 'name', {
        value: 'UsersController.findOne',
      });

      fastifyAdapter.get('/users/:id', handler);

      expect(names).to.deep.equal([
        'UsersController.findOne',
        'UsersController.findOne',
      ]);
    });
  });

  describe('request targets', () => {
    const handler = sinon.spy(() => 'found');
    const middleware = sinon.spy((_req, _res, next: Function) => next());

    /**
     * "light-my-request" always sends an origin-form request target, so the
     * target is set on the request before it reaches the router.
     */
    const injectRequestTarget = async (method: string, target: string) => {
      const instance = fastifyAdapter.getInstance();
      await instance.ready();
      return inject(
        (req, res) => {
          req.url = target;
          instance.routing(req as any, res as any);
        },
        { method: method as any, url: '/' },
      );
    };

    beforeEach(async () => {
      handler.resetHistory();
      middleware.resetHistory();
      fastifyAdapter.setNotFoundHandler((_req, reply) =>
        reply.code(404).send('not found'),
      );
      const register = await fastifyAdapter.createMiddlewareFactory(
        RequestMethod.ALL,
      );
      register('/users', middleware);
      fastifyAdapter.get('/users', handler);
      fastifyAdapter.options('/', handler);
    });

    afterEach(async () => {
      await fastifyAdapter.close();
    });

    for (const target of [
      '/users',
      'http://localhost/users',
      'https://localhost/users',
    ]) {
      it(`should run the middleware and the route for "${target}"`, async () => {
        const res = await injectRequestTarget('GET', target);

        expect(res.statusCode).to.equal(200);
        expect(res.body).to.equal('found');
        expect(middleware.calledOnce).to.be.true;
      });
    }

    for (const target of ['*users', 'users', '*', 'ftp://localhost/users']) {
      it(`should pass a request for "${target}" to the not-found handler`, async () => {
        const res = await injectRequestTarget('GET', target);

        expect(res.statusCode).to.equal(404);
        expect(res.body).to.equal('not found');
        expect(handler.called).to.be.false;
        expect(middleware.called).to.be.false;
      });
    }

    it('should pass "OPTIONS *" to the not-found handler rather than to the "OPTIONS /" route', async () => {
      const res = await injectRequestTarget('OPTIONS', '*');

      expect(res.statusCode).to.equal(404);
      expect(res.body).to.equal('not found');
      expect(handler.called).to.be.false;
    });

    it('should pass a request the router did not match to the not-found handler', async () => {
      const warn = sinon.spy(fastifyAdapter.getInstance().log, 'warn');

      const res = await injectRequestTarget('GET', '*unknown');

      expect(res.statusCode).to.equal(404);
      expect(res.body).to.equal('not found');
      expect(warn.called).to.be.false;
    });
  });
});
