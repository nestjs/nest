import { RequestMethod } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { expect } from 'chai';
import * as express from 'express';
import * as sinon from 'sinon';

describe('ExpressAdapter', () => {
  afterEach(() => sinon.restore());

  describe('registerParserMiddleware', () => {
    it('should register the express built-in parsers for json and urlencoded payloads', () => {
      const expressInstance = express();
      const jsonParserInstance = express.json();
      const urlencodedInstance = express.urlencoded();
      const jsonParserSpy = sinon
        .stub(express, 'json')
        .returns(jsonParserInstance);
      const urlencodedParserSpy = sinon
        .stub(express, 'urlencoded')
        .returns(urlencodedInstance);
      const useSpy = sinon.spy(expressInstance, 'use');
      const expressAdapter = new ExpressAdapter(expressInstance);
      useSpy.resetHistory();

      expressAdapter.registerParserMiddleware();

      expect(useSpy.calledTwice).to.be.true;
      expect(useSpy.calledWith(sinon.match.same(jsonParserInstance))).to.be
        .true;
      expect(useSpy.calledWith(sinon.match.same(urlencodedInstance))).to.be
        .true;
      expect(jsonParserSpy.calledOnceWith({})).to.be.true;
      expect(urlencodedParserSpy.calledOnceWith({ extended: true })).to.be.true;
    });

    it('should not register default parsers if custom parsers have already been registered', () => {
      const expressInstance = express();
      expressInstance.use(function jsonParser() {});
      expressInstance.use(function urlencodedParser() {});
      const useSpy = sinon.spy(expressInstance, 'use');
      const expressAdapter = new ExpressAdapter(expressInstance);
      useSpy.resetHistory();

      expressAdapter.registerParserMiddleware();

      expect(useSpy.called).to.be.false;
    });
  });

  describe('getRouteMatchingOptions', () => {
    it('should match paths case-insensitively and ignore a trailing slash by default', () => {
      expect(new ExpressAdapter().getRouteMatchingOptions()).to.deep.equal({
        caseSensitive: false,
        ignoreTrailingSlash: true,
      });
    });

    it('should follow the "case sensitive routing" and "strict routing" settings', () => {
      const app = express();
      app.set('case sensitive routing', true);
      app.set('strict routing', true);

      expect(new ExpressAdapter(app).getRouteMatchingOptions()).to.deep.equal({
        caseSensitive: true,
        ignoreTrailingSlash: false,
      });
    });

    it('should ignore settings changed after the router was created, as the router does', () => {
      const app = express();
      app.use((_req, _res, next) => next());
      app.set('case sensitive routing', true);
      app.set('strict routing', true);

      expect(new ExpressAdapter(app).getRouteMatchingOptions()).to.deep.equal({
        caseSensitive: false,
        ignoreTrailingSlash: true,
      });
    });
  });

  describe('createMiddlewareFactory', () => {
    // Plain-path routes such as forRoutes('*') carry no request method
    // (see RoutesMapper.getRouteInfoFromPath).
    const NO_REQUEST_METHOD = -1 as RequestMethod;
    let expressAdapter: ExpressAdapter;

    beforeEach(() => {
      expressAdapter = new ExpressAdapter();
    });

    for (const { method, path, expressMethod, registeredPath } of [
      {
        method: NO_REQUEST_METHOD,
        path: '/api$',
        expressMethod: 'all',
        registeredPath: '/api',
      },
      {
        method: NO_REQUEST_METHOD,
        path: '/api/v1$',
        expressMethod: 'all',
        registeredPath: '/api/v1',
      },
      {
        method: RequestMethod.GET,
        path: '/api$',
        expressMethod: 'get',
        registeredPath: '/api',
      },
    ] as const) {
      it(`should register the exact-match path ${path} through "${expressMethod}" at ${registeredPath}`, () => {
        const expressInstance = expressAdapter.getInstance();
        const routeSpy = sinon.spy(expressInstance, expressMethod);
        const useSpy = sinon.spy(expressInstance, 'use');
        const handler = sinon.spy();

        expressAdapter.createMiddlewareFactory(method)(path, handler);

        expect(routeSpy.calledOnce).to.be.true;
        expect(routeSpy.firstCall.args[0]).to.equal(registeredPath);
        expect(routeSpy.firstCall.args[1]).to.be.a('function');
        expect(useSpy.called).to.be.false;
      });
    }

    it('should run the middleware once for a request matching more than one of its paths', () => {
      const allSpy = sinon.spy(expressAdapter.getInstance(), 'all');
      const useSpy = sinon.spy(expressAdapter.getInstance(), 'use');
      const middleware = sinon.spy();
      const next = sinon.spy();

      const registerMiddleware =
        expressAdapter.createMiddlewareFactory(NO_REQUEST_METHOD);
      registerMiddleware('/api$', middleware);
      registerMiddleware('/api/{*path}', middleware);
      const [, exactHandler] = allSpy.firstCall.args as unknown as [
        string,
        Function,
      ];
      const [, wildcardHandler] = useSpy.firstCall.args as unknown as [
        string,
        Function,
      ];

      // Both "/api" (not strict) and "/api/{*path}" match "/api/", while
      // "/api/*path" would not
      const req = { path: '/api/' };
      exactHandler(req, {}, next);
      expect(middleware.calledOnceWithExactly(req, {}, next)).to.be.true;

      wildcardHandler(req, {}, next);
      expect(middleware.calledOnce).to.be.true;
      expect(next.calledOnce).to.be.true;

      const anotherReq = { path: '/api/' };
      wildcardHandler(anotherReq, {}, next);
      expect(middleware.lastCall.args).to.deep.equal([anotherReq, {}, next]);
    });
  });
});
