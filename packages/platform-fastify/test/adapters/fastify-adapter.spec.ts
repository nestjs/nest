import middie from '@fastify/middie';
import {
  Logger,
  RequestMethod,
  StreamableFile,
  VERSION_NEUTRAL,
  VersioningType,
} from '@nestjs/common';
import { LegacyRouteConverter } from '@nestjs/core/router/legacy-route-converter';
import { expect } from 'chai';
import {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  fastify,
} from 'fastify';
import { EventEmitter } from 'events';
import * as http from 'http';
import { inject } from 'light-my-request';
import { AddressInfo } from 'net';
import * as sinon from 'sinon';
import { PassThrough, Readable } from 'stream';
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

    // The router decodes the reserved characters of a segment before it
    // matches the text that follows a parameter there, and stores "%" as "%25"
    describe('with a reserved character in the text of the path', () => {
      for (const [path, requestPath] of [
        ['/avatars/:user-avatar@2x.png', '/avatars/alice-avatar@2x.png'],
        ['/avatars/:user-avatar@2x.png', '/avatars/alice-avatar%402x.png'],
        ['/skus/:sku-color=:color', '/skus/42-color%3Dred'],
        ['/discounts/100%', '/discounts/100%25'],
        ['/discounts/:id-100%', '/discounts/5-100%2525'],
      ]) {
        it(`should run the middleware of "${path}" for "${requestPath}"`, async () => {
          const adapter = new FastifyAdapter();
          let urls: { url: string; originalUrl: string } | undefined;
          const middleware = sinon.spy((req, _res, next: Function) => {
            urls = { url: req.url, originalUrl: req.originalUrl };
            next();
          });
          const register = await adapter.createMiddlewareFactory(
            RequestMethod.GET,
          );
          register(path, middleware);
          adapter.get(path, () => 'route');

          const url = `${requestPath}?size=2`;
          const res = await adapter.inject({ method: 'GET', url });

          expect(res.body).to.equal('route');
          expect(middleware.calledOnce).to.be.true;
          expect(urls).to.deep.equal({ url: '/?size=2', originalUrl: url });
          await adapter.close();
        });
      }

      it('should run the middleware on a case-insensitive router', async () => {
        const adapter = new FastifyAdapter({
          routerOptions: { caseSensitive: false },
        });
        const middleware = sinon.spy((_req, _res, next: Function) => next());
        const register = await adapter.createMiddlewareFactory(
          RequestMethod.GET,
        );
        register('/Avatars/:user-avatar@2x.png', middleware);
        adapter.get('/Avatars/:user-avatar@2x.png', () => 'route');

        const res = await adapter.inject({
          method: 'GET',
          url: '/AVATARS/alice-avatar%402x.png',
        });

        expect(res.body).to.equal('route');
        expect(middleware.calledOnce).to.be.true;
        await adapter.close();
      });

      for (const [path, routePath, url] of [
        [
          '/avatars/:user-avatar@2x.png',
          '/avatars/:user',
          '/avatars/alice-avatar%403x.png',
        ],
        // The text of a segment without a parameter is compared as it is
        ['/users/@me', '/users/:id', '/users/%40me'],
        ['/users/:id/@me', '/users/:id/:name', '/users/1/%40me'],
      ]) {
        it(`should not run the middleware of "${path}" for the route "${routePath}"`, async () => {
          const adapter = new FastifyAdapter();
          const middleware = sinon.spy((_req, _res, next: Function) => next());
          const register = await adapter.createMiddlewareFactory(
            RequestMethod.GET,
          );
          register(path, middleware);
          adapter.get(path, () => 'guarded');
          adapter.get(routePath, () => 'route');

          const res = await adapter.inject({ method: 'GET', url });

          expect(res.body).to.equal('route');
          expect(middleware.called).to.be.false;
          await adapter.close();
        });
      }
    });

    describe('on a case-insensitive router', () => {
      let adapter: FastifyAdapter;
      let urls: { url: string; originalUrl: string };
      const middleware = sinon.spy((req, _res, next: Function) => {
        // middie restores "req.url" once the middleware calls "next"
        urls = { url: req.url, originalUrl: req.originalUrl };
        next();
      });

      const setUp = async (
        createAdapter: () => FastifyAdapter,
        path = '/tasks',
      ) => {
        adapter = createAdapter();
        const register = await adapter.createMiddlewareFactory(
          RequestMethod.ALL,
        );
        register(path, middleware);
        adapter.get(path, () => 'tasks');
      };

      afterEach(async () => {
        middleware.resetHistory();
        await adapter.close();
      });

      // "%E2%84%AA" (KELVIN SIGN) lower-cases to "k" once decoded, so the
      // router serves "/tas%E2%84%AAs" with the "/tasks" route
      for (const url of [
        '/tasks',
        '/TASKS',
        '/tas%E2%84%AAs',
        '/TAS%E2%84%AAS',
      ]) {
        it(`should run the middleware of the route for "${url}"`, async () => {
          await setUp(
            () =>
              new FastifyAdapter({ routerOptions: { caseSensitive: false } }),
          );

          const res = await adapter.inject({ method: 'GET', url });

          expect(res.body).to.equal('tasks');
          expect(middleware.calledOnce).to.be.true;
        });
      }

      // The router lower-cases the paths of its routes with "toLowerCase()",
      // which the "i" flag of a RegExp does not follow for every letter:
      // "\u0130" lower-cases to "i\u0307", "\u1E9E" to "\u00DF" and "\u212A"
      // (KELVIN SIGN) to "k"
      for (const [path, url] of [
        ['/\u0130adeler', '/%C4%B0adeler'],
        ['/\u0130adeler', '/i%CC%87adeler'],
        ['/stra\u1E9Ee', '/stra%E1%BA%9Ee'],
        ['/stra\u1E9Ee', '/stra%C3%9Fe'],
        ['/tas\u212As', '/tas%E2%84%AAs'],
        ['/tas\u212As', '/tasks'],
        ['/\u0130adeler/:Id', '/i%CC%87adeler/1'],
      ]) {
        it(`should run the middleware of the "${path}" route for "${url}"`, async () => {
          await setUp(
            () =>
              new FastifyAdapter({ routerOptions: { caseSensitive: false } }),
            path,
          );

          const res = await adapter.inject({ method: 'GET', url });

          expect(res.body).to.equal('tasks');
          expect(middleware.calledOnce).to.be.true;
        });
      }

      it('should not lower-case the path of the middleware on a case-sensitive router', async () => {
        await setUp(() => new FastifyAdapter(), '/\u0130adeler');

        const res = await adapter.inject({
          method: 'GET',
          url: '/%C4%B0adeler',
        });

        expect(res.body).to.equal('tasks');
        expect(middleware.calledOnce).to.be.true;
      });

      it('should run the middleware of the route with the top-level "caseSensitive" option', async () => {
        await setUp(() => new FastifyAdapter({ caseSensitive: false }));

        const res = await adapter.inject({
          method: 'GET',
          url: '/tas%E2%84%AAs',
        });

        expect(res.body).to.equal('tasks');
        expect(middleware.calledOnce).to.be.true;
      });

      for (const [name, caseSensitive] of [
        ['case-sensitive', true],
        ['case-insensitive', false],
      ] as const) {
        it(`should strip the middleware path from "req.url" on a ${name} router`, async () => {
          await setUp(
            () => new FastifyAdapter({ routerOptions: { caseSensitive } }),
          );

          await adapter.inject({ method: 'GET', url: '/tasks?done=true' });

          expect(middleware.calledOnce).to.be.true;
          expect(urls).to.deep.equal({
            url: '/?done=true',
            originalUrl: '/tasks?done=true',
          });
        });
      }
    });

    // The proxies of `RouterProxy` reject when the exception layer throws
    // while it answers an error thrown by the middleware
    describe('when the middleware rejects', () => {
      const handler = sinon.spy(() => 'cats');

      beforeEach(() => {
        handler.resetHistory();
        fastifyAdapter.setErrorHandler((err: Error, _req, reply) =>
          reply.code(500).send(`error handler: ${err.message}`),
        );
      });

      afterEach(async () => {
        await fastifyAdapter.close();
      });

      it('should pass the rejection to the error handler', async () => {
        const register = await fastifyAdapter.createMiddlewareFactory(
          RequestMethod.ALL,
        );
        register('/cats', async () => {
          throw new Error('exception layer failed');
        });
        fastifyAdapter.get('/cats', handler);

        const res = await fastifyAdapter.inject({
          method: 'GET',
          url: '/cats',
        });

        expect(res.statusCode).to.equal(500);
        expect(res.body).to.equal('error handler: exception layer failed');
        expect(handler.called).to.be.false;
      });

      it('should log a rejection that follows a call to "next"', async () => {
        const error = sinon.stub(Logger.prototype, 'error');
        let rejection!: Promise<void>;
        const register = await fastifyAdapter.createMiddlewareFactory(
          RequestMethod.ALL,
        );
        register('/cats', (_req: unknown, _res: unknown, next: () => void) => {
          next();
          rejection = Promise.reject(new Error('exception layer failed'));
          return rejection;
        });
        fastifyAdapter.get('/cats', handler);

        const res = await fastifyAdapter.inject({
          method: 'GET',
          url: '/cats',
        });
        await rejection.catch(() => {});

        expect(res.statusCode).to.equal(200);
        expect(res.body).to.equal('cats');
        expect(error.calledOnce).to.be.true;
      });
    });

    // `NestFactory.create()` calls `init()`, which registers middie, and
    // `app.init()` registers Nest middleware once `main.ts` ran. middie gives
    // the context of a plugin registered in between a copy of the middleware
    // of the root, as it was then.
    describe('with a plugin registered with an awaited register() before', () => {
      let adapter: FastifyAdapter;
      let urls: { url: string; originalUrl: string };
      const middleware = sinon.spy((req, _res, next: Function) => {
        // middie restores "req.url" once the middleware calls "next"
        urls = { url: req.url, originalUrl: req.originalUrl };
        next();
      });
      const plugin = async (instance: FastifyInstance) => {
        instance.get('/jobs', async () => 'jobs');
        await instance.register(
          async nested => {
            nested.get('/nested', async () => 'nested');
          },
          { prefix: '/nested' },
        );
      };

      beforeEach(() => {
        middleware.resetHistory();
        adapter = new FastifyAdapter();
      });

      afterEach(async () => {
        await adapter.close();
      });

      for (const url of ['/queues/jobs', '/queues/nested/nested']) {
        it(`should run the middleware on "${url}"`, async () => {
          await adapter.init();
          await adapter.register(plugin, { prefix: '/queues' });
          const register = await adapter.createMiddlewareFactory(
            RequestMethod.ALL,
          );
          register('/queues/{*path}', middleware);

          const res = await adapter.inject({ method: 'GET', url });

          expect(res.statusCode).to.equal(200);
          expect(middleware.calledOnce).to.be.true;
        });
      }

      it('should only run the middleware for its path, and strip it from "req.url"', async () => {
        await adapter.init();
        await adapter.register(plugin, { prefix: '/queues' });
        const register = await adapter.createMiddlewareFactory(
          RequestMethod.ALL,
        );
        register('/queues/jobs', middleware);

        await adapter.inject({ method: 'GET', url: '/queues/nested/nested' });
        expect(middleware.called).to.be.false;

        await adapter.inject({ method: 'GET', url: '/queues/jobs?done=true' });
        expect(middleware.calledOnce).to.be.true;
        expect(urls).to.deep.equal({
          url: '/?done=true',
          originalUrl: '/queues/jobs?done=true',
        });
      });

      it('should run the middleware once on a plugin registered without await', async () => {
        await adapter.init();
        adapter.register(plugin, { prefix: '/queues' });
        const register = await adapter.createMiddlewareFactory(
          RequestMethod.ALL,
        );
        register('/queues/{*path}', middleware);

        await adapter.inject({ method: 'GET', url: '/queues/nested/nested' });

        expect(middleware.calledOnce).to.be.true;
      });

      // `Test.createNestApplication()` registers middie in `app.init()`
      it('should run the middleware once on a plugin registered before middie', async () => {
        await adapter.register(plugin, { prefix: '/queues' });
        await adapter.init();
        const register = await adapter.createMiddlewareFactory(
          RequestMethod.ALL,
        );
        register('/queues/{*path}', middleware);

        await adapter.inject({ method: 'GET', url: '/queues/nested/nested' });

        expect(middleware.calledOnce).to.be.true;
      });

      // The application registers middie itself, in place of `init()`
      describe('and "skipMiddie"', () => {
        beforeEach(async () => {
          await adapter.close();
          adapter = new FastifyAdapter({ skipMiddie: true });
        });

        for (const url of ['/queues/jobs', '/queues/nested/nested']) {
          it(`should run the middleware on "${url}"`, async () => {
            await adapter.register(middie);
            await adapter.register(plugin, { prefix: '/queues' });
            const register = await adapter.createMiddlewareFactory(
              RequestMethod.ALL,
            );
            register('/queues/{*path}', middleware);

            const res = await adapter.inject({ method: 'GET', url });

            expect(res.statusCode).to.equal(200);
            expect(middleware.calledOnce).to.be.true;
          });
        }

        it('should only run the middleware for its path, and strip it from "req.url"', async () => {
          await adapter.register(middie);
          await adapter.register(plugin, { prefix: '/queues' });
          const register = await adapter.createMiddlewareFactory(
            RequestMethod.ALL,
          );
          register('/queues/jobs', middleware);

          await adapter.inject({ method: 'GET', url: '/queues/nested/nested' });
          expect(middleware.called).to.be.false;

          await adapter.inject({
            method: 'GET',
            url: '/queues/jobs?done=true',
          });
          expect(middleware.calledOnce).to.be.true;
          expect(urls).to.deep.equal({
            url: '/?done=true',
            originalUrl: '/queues/jobs?done=true',
          });
        });

        it('should run the middleware once on a plugin registered without await', async () => {
          await adapter.register(middie);
          adapter.register(plugin, { prefix: '/queues' });
          const register = await adapter.createMiddlewareFactory(
            RequestMethod.ALL,
          );
          register('/queues/{*path}', middleware);

          await adapter.inject({ method: 'GET', url: '/queues/nested/nested' });

          expect(middleware.calledOnce).to.be.true;
        });

        it('should run the middleware once on a plugin registered before middie', async () => {
          await adapter.register(plugin, { prefix: '/queues' });
          await adapter.register(middie);
          const register = await adapter.createMiddlewareFactory(
            RequestMethod.ALL,
          );
          register('/queues/{*path}', middleware);

          await adapter.inject({ method: 'GET', url: '/queues/nested/nested' });

          expect(middleware.calledOnce).to.be.true;
        });
      });
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

    // "request.params" holds the last value of a repeated parameter name
    for (const [path, url] of [
      ['/projects/:id/tasks/:id', '/projects//tasks/5'],
      ['/projects/:id/tasks/:id', '/projects/1/tasks/'],
      ['/projects/:id/tasks/:id.json', '/projects//tasks/5.json'],
      ['/ranges/:id-:id', '/ranges/-b'],
      ['/files/:id/:id/*', '/files//b/c'],
    ]) {
      it(`should pass a request for "${path}" with an empty value of a repeated parameter name (${url}) to the not-found handler`, async () => {
        const handler = sinon.spy(() => 'found');
        fastifyAdapter.get(path, handler);

        const res = await fastifyAdapter.inject({ method: 'GET', url });

        expect(res.statusCode).to.equal(404);
        expect(res.body).to.equal('not found');
        expect(handler.called).to.be.false;
      });
    }

    for (const [path, url, params] of [
      ['/projects/:id/tasks/:id', '/projects/1/tasks/5?sort=asc', { id: '5' }],
      ['/ranges/:id-:id', '/ranges/a-b', { id: 'b' }],
      ['/files/:id/:id/*', '/files/a/b/', { id: 'b', '*': '' }],
      ['/files/:id/:id/*', '/files/a/b/c/d', { id: 'b', '*': 'c/d' }],
    ] as const) {
      it(`should call the handler of "${path}" when every value of a repeated parameter name is set (${url})`, async () => {
        const handler = sinon.spy((req: FastifyRequest) => req.params);
        fastifyAdapter.get(path, handler);

        const res = await fastifyAdapter.inject({ method: 'GET', url });

        expect(res.statusCode).to.equal(200);
        expect(JSON.parse(res.body)).to.deep.equal(params);
        expect(handler.calledOnce).to.be.true;
      });
    }

    it('should match a route with a repeated parameter name with the options of the router', async () => {
      fastifyAdapter = new FastifyAdapter({
        routerOptions: {
          caseSensitive: false,
          ignoreTrailingSlash: true,
          maxParamLength: 200,
        },
      });
      fastifyAdapter.setNotFoundHandler((_req, reply) =>
        reply.code(404).send('not found'),
      );
      const handler = sinon.spy(() => 'found');
      fastifyAdapter.get('/Projects/:id/tasks/:id', handler);

      const res = await fastifyAdapter.inject({
        method: 'GET',
        url: `/PROJECTS/${'a'.repeat(150)}/tasks/5/`,
      });
      expect(res.statusCode).to.equal(200);
      expect(res.body).to.equal('found');

      const emptyRes = await fastifyAdapter.inject({
        method: 'GET',
        url: '/projects//tasks/5/',
      });
      expect(emptyRes.statusCode).to.equal(404);
      expect(handler.calledOnce).to.be.true;
    });

    it('should pass a request with an empty value of a repeated parameter name to the not-found handler for routes registered with all()', async () => {
      const handler = sinon.spy(() => 'found');
      fastifyAdapter.all('/projects/:id/tasks/:id', handler);

      for (const method of ['GET', 'POST'] as const) {
        const res = await fastifyAdapter.inject({
          method,
          url: '/projects//tasks/5',
        });
        expect(res.statusCode).to.equal(404);
      }
      expect(handler.called).to.be.false;

      const res = await fastifyAdapter.inject({
        method: 'POST',
        url: '/projects/1/tasks/5',
      });
      expect(res.body).to.equal('found');
    });

    // Only paths in the syntax of path-to-regexp can have middleware: no
    // route-bound middleware can be registered for these
    for (const path of [
      '/projects/:id/tasks/:id?',
      '/projects/:id/tasks/:id(^\\d+$)',
      '/a::b/:id/:id',
    ]) {
      it(`should not register middleware for a path in the syntax of find-my-way only (${path})`, async () => {
        sinon.stub(LegacyRouteConverter, 'printError');
        const register = await fastifyAdapter.createMiddlewareFactory(
          RequestMethod.GET,
        );

        expect(() => register(path, () => {})).to.throw(TypeError);
      });
    }

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
      'http://localhost/users?a=/b',
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

    // "find-my-way" < 9.9.0 routes these as "/users", later versions as "/"
    for (const target of [
      'http://localhost?a/users',
      'https://localhost??a/users',
      'http://user@localhost?/users',
    ]) {
      it(`should pass a request for "${target}", whose query precedes a "/", to the not-found handler`, async () => {
        fastifyAdapter.get('/', handler);

        const res = await injectRequestTarget('GET', target);

        expect(res.statusCode).to.equal(404);
        expect(res.body).to.equal('not found');
        expect(handler.called).to.be.false;
        expect(middleware.called).to.be.false;
      });
    }

    it('should route an absolute-form request target with a query and no path as "/"', async () => {
      fastifyAdapter.get('/', handler);

      const res = await injectRequestTarget('GET', 'http://localhost?a=b');

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.equal('found');
      expect(middleware.called).to.be.false;
    });

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

  describe('when the extractor of custom versioning throws', () => {
    const handler = sinon.spy(() => 'found');
    const middleware = sinon.spy((_req, _res, next: Function) => next());

    beforeEach(async () => {
      handler.resetHistory();
      middleware.resetHistory();
      fastifyAdapter.setErrorHandler((err: Error, _req, reply) =>
        reply.code(500).send(`error handler: ${err.message}`),
      );
      fastifyAdapter.setNotFoundHandler((_req, reply) =>
        reply.code(404).send('not found'),
      );
      const register = await fastifyAdapter.createMiddlewareFactory(
        RequestMethod.ALL,
      );
      register('/{*path}', middleware);
      const extractor = (req: { headers: Record<string, unknown> }) => {
        if (req.headers['x-throw']) {
          throw new Error('extractor failed');
        }
        return '1';
      };
      fastifyAdapter.get(
        '/versioned',
        fastifyAdapter.applyVersionFilter(handler, '1', {
          type: VersioningType.CUSTOM,
          extractor,
        }),
      );
      fastifyAdapter.get(
        '/neutral',
        fastifyAdapter.applyVersionFilter(handler, VERSION_NEUTRAL, {
          type: VersioningType.CUSTOM,
          extractor,
        }),
      );
    });

    afterEach(async () => {
      await fastifyAdapter.close();
    });

    for (const url of ['/versioned', '/neutral', '/unknown']) {
      it(`should pass the exception to the error handler for "${url}"`, async () => {
        const res = await fastifyAdapter.inject({
          method: 'GET',
          url,
          headers: { 'x-throw': '1' },
        });

        expect(res.statusCode).to.equal(500);
        expect(res.body).to.equal('error handler: extractor failed');
        expect(handler.called).to.be.false;
        expect(middleware.called).to.be.false;
      });
    }

    it('should route the next request', async () => {
      await fastifyAdapter.inject({
        method: 'GET',
        url: '/versioned',
        headers: { 'x-throw': '1' },
      });

      const res = await fastifyAdapter.inject({
        method: 'GET',
        url: '/versioned',
      });

      expect(res.statusCode).to.equal(200);
      expect(res.body).to.equal('found');
    });
  });

  describe('useBodyParser', () => {
    const post = (contentType: string, payload: string) =>
      fastifyAdapter.inject({
        method: 'POST',
        url: '/',
        headers: { 'content-type': contentType },
        payload,
      });

    afterEach(async () => {
      await fastifyAdapter.close();
    });

    describe('with a custom parser that returns a promise or throws', () => {
      type Done = (err: Error | null, body?: unknown) => void;
      const parse = (body: Buffer) => {
        if (body.toString() === 'malformed') {
          throw new Error('malformed body');
        }
        return `custom:${body.toString()}`;
      };
      const handler = sinon.spy((req: FastifyRequest, reply: FastifyReply) =>
        fastifyAdapter.reply(reply, { body: req.body }),
      );

      beforeEach(() => {
        handler.resetHistory();
        fastifyAdapter.setErrorHandler((err: Error, _req, reply) =>
          reply.code(500).send(`error handler: ${err.message}`),
        );
        fastifyAdapter.post('/', handler);
      });

      for (const [name, parser] of [
        [
          'an async parser that calls "done"',
          async (_req: unknown, body: Buffer, done: Done) => {
            await Promise.resolve();
            done(null, parse(body));
          },
        ],
        [
          'an async parser that calls "done" after it resolved',
          async (_req: unknown, body: Buffer, done: Done) => {
            const parsed = parse(await Promise.resolve(body));
            setImmediate(() => done(null, parsed));
          },
        ],
        [
          'a parser that resolves with the body',
          async (_req: unknown, body: Buffer) => {
            await Promise.resolve();
            return parse(body);
          },
        ],
        [
          'a synchronous parser that calls "done"',
          (_req: unknown, body: Buffer, done: Done) => {
            done(null, parse(body));
          },
        ],
      ] as const) {
        describe(name, () => {
          beforeEach(() => {
            fastifyAdapter.useBodyParser(
              'text/custom',
              false,
              {},
              parser as any,
            );
          });

          it('should pass the parsed body to the handler once', async () => {
            const res = await post('text/custom', 'hello');
            await new Promise(resolve => setImmediate(resolve));

            expect(res.statusCode).to.equal(200);
            expect(JSON.parse(res.body)).to.deep.equal({
              body: 'custom:hello',
            });
            expect(handler.calledOnce).to.be.true;
          });

          it('should pass what it throws or rejects with to the error handler', async () => {
            const res = await post('text/custom', 'malformed');

            expect(res.statusCode).to.equal(500);
            expect(res.body).to.equal('error handler: malformed body');
            expect(handler.called).to.be.false;
          });
        });
      }

      it('should log a rejection that follows a call to "done"', async () => {
        const error = sinon.stub(Logger.prototype, 'error');
        let rejection!: Promise<void>;
        fastifyAdapter.useBodyParser(
          'text/custom',
          false,
          {},
          (_req, body, done) => {
            done(null, parse(body));
            rejection = Promise.reject(new Error('parser failed'));
            return rejection;
          },
        );

        const res = await post('text/custom', 'hello');
        await rejection.catch(() => {});

        expect(res.statusCode).to.equal(200);
        expect(JSON.parse(res.body)).to.deep.equal({ body: 'custom:hello' });
        expect(handler.calledOnce).to.be.true;
        expect(error.calledOnce).to.be.true;
      });
    });
  });

  describe('use', () => {
    let adapter: FastifyAdapter;
    const handler = sinon.spy(() => 'ok');

    beforeEach(() => {
      handler.resetHistory();
      adapter = new FastifyAdapter();
      adapter.setErrorHandler((err: Error, _req, reply) =>
        reply.code(500).send(`error handler: ${err.message}`),
      );
    });

    afterEach(async () => {
      await adapter.close();
    });

    const rejecting = async () => {
      await Promise.resolve();
      throw new Error('rejected');
    };
    const get = (url = '/a') => adapter.inject({ method: 'GET', url });

    it('should pass the rejection of an async middleware to the error handler', async () => {
      await adapter.init();
      adapter.use(rejecting);
      adapter.get('/a', handler);

      const res = await get();

      expect(res.statusCode).to.equal(500);
      expect(res.body).to.equal('error handler: rejected');
      expect(handler.called).to.be.false;
    });

    it('should pass the rejection of a middleware queued before init to the error handler', async () => {
      adapter.use(rejecting);
      await adapter.init();
      adapter.get('/a', handler);

      const res = await get();

      expect(res.body).to.equal('error handler: rejected');
    });

    it('should pass what a middleware throws after an earlier one called "next" asynchronously to the error handler', async () => {
      await adapter.init();
      adapter.use(async (_req: unknown, _res: unknown, next: () => void) => {
        await Promise.resolve();
        next();
      });
      adapter.use(() => {
        throw new Error('thrown');
      });
      adapter.get('/a', handler);

      const res = await get();

      expect(res.body).to.equal('error handler: thrown');
      expect(handler.called).to.be.false;
    });

    it('should run the middleware of a path, and of a list, in the same way', async () => {
      await adapter.init();
      const calls: string[] = [];
      adapter.use('/a', (_req: unknown, _res: unknown, next: () => void) => {
        calls.push('path');
        next();
      });
      adapter.use([
        (_req: unknown, _res: unknown, next: () => void) => {
          calls.push('list');
          next();
        },
      ]);
      adapter.use('/b', [rejecting]);
      adapter.get('/a', handler);
      adapter.get('/b', handler);

      const a = await get('/a');
      const b = await get('/b');

      expect(a.body).to.equal('ok');
      expect(b.body).to.equal('error handler: rejected');
      expect(calls).to.deep.equal(['path', 'list', 'list']);
    });

    it('should hand a function with more than three parameters to "use()" as it is', async () => {
      await adapter.close();
      adapter = new FastifyAdapter({ skipMiddie: true });
      await adapter.register(middie);
      const use = sinon.spy(adapter.getInstance() as any, 'use');
      const errorHandler = (
        _err: unknown,
        _req: unknown,
        _res: unknown,
        next: () => void,
      ) => next();

      adapter.use(errorHandler);

      expect(use.calledWith(errorHandler)).to.be.true;
    });
  });

  describe('with a "__proto__" key in a urlencoded body', () => {
    const form = 'application/x-www-form-urlencoded';
    const registerKeysRoute = () =>
      fastifyAdapter.post('/', (req: FastifyRequest, reply: FastifyReply) =>
        fastifyAdapter.reply(reply, {
          keys: Object.keys(req.body as object),
        }),
      );
    const post = (contentType: string, payload: string) =>
      fastifyAdapter.inject({
        method: 'POST',
        url: '/',
        headers: { 'content-type': contentType },
        payload,
      });

    afterEach(async () => {
      await fastifyAdapter.close();
    });

    for (const payload of [
      'msg=hello&__proto__=a',
      'msg=hello&__proto__=a&__proto__=b',
      'msg=hello&%5F_proto__=a',
    ]) {
      it(`should reject "${payload}" by default, as a JSON body`, async () => {
        fastifyAdapter.registerParserMiddleware();
        registerKeysRoute();

        const res = await post(form, payload);
        expect(res.statusCode).to.equal(400);
        expect(JSON.parse(res.body).message).to.equal(
          'Object contains forbidden prototype property',
        );

        const json = await post(
          'application/json',
          '{"msg":"hello","__proto__":["a","b"]}',
        );
        expect(json.statusCode).to.equal(400);
      });
    }

    it('should accept a key that only contains "__proto__"', async () => {
      fastifyAdapter.registerParserMiddleware();
      registerKeysRoute();

      const res = await post(form, 'msg=hello&__proto__x=a&a__proto__=b');

      expect(res.statusCode).to.equal(200);
      expect(JSON.parse(res.body).keys).to.deep.equal([
        'msg',
        '__proto__x',
        'a__proto__',
      ]);
    });

    it('should remove the key when "onProtoPoisoning" is "remove"', async () => {
      fastifyAdapter = new FastifyAdapter({ onProtoPoisoning: 'remove' });
      fastifyAdapter.registerParserMiddleware();
      registerKeysRoute();

      const res = await post(form, 'msg=hello&__proto__=a&__proto__=b');

      expect(res.statusCode).to.equal(200);
      expect(JSON.parse(res.body).keys).to.deep.equal(['msg']);
    });

    it('should keep the key when "onProtoPoisoning" is "ignore"', async () => {
      fastifyAdapter = new FastifyAdapter({ onProtoPoisoning: 'ignore' });
      fastifyAdapter.registerParserMiddleware();
      registerKeysRoute();

      const res = await post(form, 'msg=hello&__proto__=a&__proto__=b');

      expect(res.statusCode).to.equal(200);
      expect(JSON.parse(res.body).keys).to.deep.equal(['msg', '__proto__']);
    });
  });

  describe('reply', () => {
    const createReply = () => ({
      status: sinon.stub(),
      send: sinon.stub(),
      getHeader: sinon.stub(),
      header: sinon.stub(),
    });

    it('should destroy the stream of a StreamableFile once the reply was sent', () => {
      // e.g. by Fastify's `handlerTimeout`: send() then drops the stream
      const reply = { ...createReply(), sent: true };
      const source = new PassThrough();

      fastifyAdapter.reply(reply as any, new StreamableFile(source));

      expect(source.destroyed).to.be.true;
    });

    it('should destroy the streams of pipelined responses when the connection closes', async () => {
      // Responses queued behind an unread one on the same connection: they
      // have no socket of their own, and may never be closed themselves
      const connection = Object.assign(new EventEmitter(), {
        destroyed: false,
      });
      const sources = Array.from({ length: 3 }, () => new PassThrough());
      for (const source of sources) {
        const reply = {
          ...createReply(),
          raw: Object.assign(new PassThrough(), {
            req: { method: 'GET', socket: connection },
          }),
        };
        fastifyAdapter.reply(reply as any, new StreamableFile(source));
        source.write('partial');
      }
      expect(connection.listenerCount('close')).to.equal(1);

      connection.emit('close');

      for (let i = 0; i < 10 && !sources.every(s => s.destroyed); i++) {
        await new Promise(resolve => setImmediate(resolve));
      }
      expect(sources.every(source => source.destroyed)).to.be.true;
    });

    // Over a socket: the response of `inject()` is not a ServerResponse
    const request = async () => {
      if (!fastifyAdapter.getHttpServer().listening) {
        await fastifyAdapter
          .getInstance()
          .listen({ port: 0, host: '127.0.0.1' });
      }
      const { port } = fastifyAdapter.getHttpServer().address() as AddressInfo;
      return new Promise<{
        clientRequest: http.ClientRequest;
        response: http.IncomingMessage;
      }>((resolve, reject) => {
        const clientRequest = http
          .get({ host: '127.0.0.1', port, path: '/' }, response =>
            resolve({ clientRequest, response }),
          )
          .on('error', reject);
      });
    };
    const readBody = (response: http.IncomingMessage) =>
      new Promise<string>((resolve, reject) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', chunk => (body += chunk));
        response.on('end', () => resolve(body));
        response.on('error', reject);
      });

    describe('for a StreamableFile in object mode', () => {
      let file: StreamableFile;
      let write: sinon.SinonSpy;
      let errorLogger: sinon.SinonStub;

      beforeEach(() => {
        errorLogger = sinon.stub();
        fastifyAdapter.get('/', (_req: FastifyRequest, reply: FastifyReply) => {
          write = sinon.spy(reply.raw, 'write');
          fastifyAdapter.reply(reply, file);
        });
      });

      afterEach(() => fastifyAdapter.close());

      const serve = (source: Readable) => {
        file = new StreamableFile(source).setErrorLogger(errorLogger);
        return request();
      };
      const waitForClose = async (response: http.IncomingMessage) => {
        response.on('error', () => {});
        response.resume();
        if (!response.closed) {
          await new Promise(resolve => response.once('close', resolve));
        }
      };
      const expectChunkError = () => {
        expect(errorLogger.calledOnce).to.be.true;
        const [err] = errorLogger.firstCall.args;
        expect(err).to.be.instanceOf(TypeError);
        expect(err.message).to.contain(
          'A StreamableFile can only send string and Uint8Array chunks',
        );
      };
      const wroteChunk = (chunk: unknown) =>
        write.getCalls().some(call => call.args[0] === chunk);

      it('should send the strings and bytes it emits', async () => {
        const { response } = await serve(
          Readable.from([
            '',
            'first ',
            Buffer.from('second '),
            new Uint8Array([116, 104, 105, 114, 100]),
          ]),
        );

        expect(response.statusCode).to.equal(200);
        expect(await readBody(response)).to.equal('first second third');
        expect(write.firstCall.args[0]).to.equal('');
      });

      it('should end the response for a source that has already ended', async () => {
        const source = Readable.from([]);
        source.resume();
        await new Promise(resolve => source.once('end', resolve));

        const { response } = await serve(source);

        expect(response.statusCode).to.equal(200);
        expect(await readBody(response)).to.equal('');
      });

      (
        [
          ['an object', { id: 1 }],
          ['an array', ['a', 'b']],
          ['a number', 42],
        ] as const
      ).forEach(([name, chunk]) => {
        it(`should fail the stream on ${name} without writing it`, async () => {
          // The chunk first, last and in between
          const sources = [
            () => Readable.from([chunk]),
            () => Readable.from(['first', chunk]),
            () => Readable.from(['first', chunk, 'last']),
          ];
          for (const createSource of sources) {
            errorLogger.resetHistory();
            const source = createSource();

            const { response } = await serve(source);
            await waitForClose(response);

            expect(response.complete && response.statusCode === 200).to.be
              .false;
            expectChunkError();
            expect(wroteChunk(chunk)).to.be.false;
            expect(source.destroyed).to.be.true;
          }
        });
      });

      it('should answer 400 for such a chunk before any data', async () => {
        const { response } = await serve(Readable.from([{ id: 1 }]));

        expect(response.statusCode).to.equal(400);
        await readBody(response);
        expectChunkError();
        // Answered with the standard body of the status by the built-in
        // exception filter, as an "http-errors" error that is not exposed
        const [err] = errorLogger.firstCall.args;
        expect(err).to.include({ status: 400, statusCode: 400, expose: false });
      });

      it('should log what the error logger of the file throws for such a chunk', async () => {
        const loggerError = new Error('logger failed');
        errorLogger.throws(loggerError);
        const logger = sinon.stub((fastifyAdapter as any).logger, 'error');

        const { response } = await serve(Readable.from([{ id: 1 }]));

        expect(response.statusCode).to.equal(400);
        await readBody(response);
        expect(logger.calledWith(loggerError)).to.be.true;
      });

      it('should abort the response for such a chunk after some data', async () => {
        const source = new PassThrough({ objectMode: true });
        source.write('first');

        const { response } = await serve(source);
        await new Promise(resolve => response.once('data', resolve));
        source.write({ id: 1 });
        await waitForClose(response);

        expect(response.complete).to.be.false;
        expectChunkError();
        expect(source.destroyed).to.be.true;
      });

      it('should abort the response when the source fails after some data', async () => {
        const source = new PassThrough({ objectMode: true });
        source.write('first');

        const { response } = await serve(source);
        await new Promise(resolve => response.once('data', resolve));
        source.destroy(new Error('EIO'));
        await waitForClose(response);

        expect(response.complete).to.be.false;
      });

      it('should destroy the source when the client goes away', async () => {
        const source = new PassThrough({ objectMode: true });
        source.write('first');

        const { clientRequest, response } = await serve(source);
        await new Promise(resolve => response.once('data', resolve));
        clientRequest.destroy();

        for (let i = 0; i < 100 && !source.destroyed; i++) {
          await new Promise(resolve => setTimeout(resolve, 5));
        }
        expect(source.destroyed).to.be.true;
      });
    });

    // e.g. the response middleware gets, and the exception filters of its
    // errors
    describe('for a StreamableFile on a raw response', () => {
      let source: PassThrough;
      let afterReply: () => void;

      beforeEach(() => {
        source = new PassThrough();
        afterReply = () => {};
        fastifyAdapter.get('/', (_req: FastifyRequest, reply: FastifyReply) => {
          reply.hijack();
          fastifyAdapter.reply(
            reply.raw,
            new StreamableFile(source, { type: 'image/png' }),
          );
          afterReply();
        });
      });

      afterEach(() => fastifyAdapter.close());

      it('should answer a stream that fails before any data with the error handler of the instance', async () => {
        const error = new Error('ENOENT');
        const errorHandler = sinon.spy((_err, _req, reply: FastifyReply) => {
          reply.code(503).type('text/plain').send('handled');
        });
        fastifyAdapter.setErrorHandler(errorHandler);
        afterReply = () => source.destroy(error);

        const { response } = await request();

        expect(response.statusCode).to.equal(503);
        expect(await readBody(response)).to.equal('handled');
        expect(errorHandler.calledWith(error)).to.be.true;
      });

      it('should abort the response when the stream fails after some data', async () => {
        source.write('first');

        const { response } = await request();
        await new Promise(resolve => response.once('data', resolve));
        source.destroy(new Error('EIO'));
        response.on('error', () => {});
        await new Promise(resolve => response.once('close', resolve));

        expect(response.complete).to.be.false;
      });

      it('should destroy the stream when the client goes away', async () => {
        source.write('first');

        const { clientRequest, response } = await request();
        await new Promise(resolve => response.once('data', resolve));
        clientRequest.destroy();

        for (let i = 0; i < 100 && !source.destroyed; i++) {
          await new Promise(resolve => setTimeout(resolve, 5));
        }
        expect(source.destroyed).to.be.true;
      });
    });
  });
});
