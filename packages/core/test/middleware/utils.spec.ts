import { RequestMethod } from '@nestjs/common';
import { addLeadingSlash } from '@nestjs/common/utils/shared.utils';
import { expect } from 'chai';
import { pathToRegexp } from 'path-to-regexp';
import * as sinon from 'sinon';
import {
  assignToken,
  filterMiddleware,
  isMiddlewareClass,
  isMiddlewareRouteExcluded,
  mapToClass,
  mapToExcludeRoute,
} from '../../middleware/utils';
import { NoopHttpAdapter } from '../utils/noop-adapter.spec';

describe('middleware utils', () => {
  const noopAdapter = new NoopHttpAdapter({});

  class Test {}
  function fnMiddleware(req, res, next) {}

  describe('mapToExcludeRoute', () => {
    it('should return exclude route metadata', () => {
      const stringRoute = 'foo';
      const routeInfo = {
        path: 'bar',
        method: RequestMethod.GET,
      };
      expect(mapToExcludeRoute([stringRoute, routeInfo])).to.eql([
        {
          path: stringRoute,
          requestMethod: RequestMethod.ALL,
          pathRegex: pathToRegexp(addLeadingSlash(stringRoute)).regexp,
        },
        {
          path: routeInfo.path,
          requestMethod: routeInfo.method,
          pathRegex: pathToRegexp(addLeadingSlash(routeInfo.path)).regexp,
        },
      ]);
    });
    describe('when route matching options are given', () => {
      const matches = (
        path: string,
        options: { caseSensitive: boolean; ignoreTrailingSlash: boolean },
        url: string,
      ) => mapToExcludeRoute([path], options)[0].pathRegex.test(url);

      it('should match paths case-sensitively when the router does', () => {
        const options = { caseSensitive: true, ignoreTrailingSlash: true };
        expect(matches('users/login', options, '/users/login')).to.equal(true);
        expect(matches('users/login', options, '/users/LOGIN')).to.equal(false);
      });
      it('should match paths case-insensitively when the router does', () => {
        const options = { caseSensitive: false, ignoreTrailingSlash: true };
        expect(matches('users/login', options, '/users/LOGIN')).to.equal(true);
      });
      it('should match a trailing slash only when the router ignores it', () => {
        expect(
          matches(
            'users/login',
            { caseSensitive: false, ignoreTrailingSlash: false },
            '/users/login/',
          ),
        ).to.equal(false);
        expect(
          matches(
            'users/login',
            { caseSensitive: false, ignoreTrailingSlash: true },
            '/users/login/',
          ),
        ).to.equal(true);
      });
      it('should match an excluded path written with a trailing slash like its route', () => {
        const strict = { caseSensitive: true, ignoreTrailingSlash: false };
        expect(matches('users/login/', strict, '/users/login')).to.equal(true);
        expect(matches('users/login/', strict, '/users/login/')).to.equal(
          false,
        );

        const loose = { caseSensitive: true, ignoreTrailingSlash: true };
        expect(matches('users/login/', loose, '/users/login')).to.equal(true);
        expect(matches('users/login/', loose, '/users/login/')).to.equal(true);
        expect(matches('users/login/', loose, '/users/login//')).to.equal(
          false,
        );
      });
      it('should keep matching the root path', () => {
        const strict = { caseSensitive: true, ignoreTrailingSlash: false };
        expect(matches('/', strict, '/')).to.equal(true);
        expect(matches('/', strict, '/users')).to.equal(false);
      });
    });
  });
  describe('filterMiddleware', () => {
    let middleware: any[];
    beforeEach(() => {
      middleware = [Test, fnMiddleware, undefined, null];
    });
    it('should return filtered middleware', () => {
      expect(filterMiddleware(middleware, [], noopAdapter)).to.have.length(2);
    });
    const expectSkippedOnlyForExactMatches = (adapter: NoopHttpAdapter) => {
      sinon.stub(adapter, 'getRequestMethod').returns('GET');
      const getRequestUrl = sinon.stub(adapter, 'getRequestUrl');
      const fn = sinon.spy();
      const next = sinon.spy();
      const [Middleware] = filterMiddleware(
        [fn],
        [{ path: 'users/login', method: RequestMethod.GET }],
        adapter,
      );
      const instance = new Middleware();

      getRequestUrl.returns('/users/login?redirect=1');
      instance.use({}, {}, next);
      expect(next.calledOnce).to.be.true;
      expect(fn.called).to.be.false;

      for (const url of ['/users/LOGIN', '/users/Login', '/users/login/']) {
        getRequestUrl.returns(url);
        instance.use({}, {}, next);
      }
      expect(fn.callCount).to.equal(3);
      expect(next.calledOnce).to.be.true;
    };

    describe('when the adapter tells how its router matches paths', () => {
      class StrictRouterAdapter extends NoopHttpAdapter {
        getRouteMatchingOptions() {
          return { caseSensitive: true, ignoreTrailingSlash: false };
        }
      }

      it('should skip the middleware only for requests the router serves with an excluded route', () => {
        expectSkippedOnlyForExactMatches(new StrictRouterAdapter({}));
      });
    });
    describe('when the adapter does not tell how its router matches paths', () => {
      it('should skip the middleware only for requests matching an excluded route exactly', () => {
        expectSkippedOnlyForExactMatches(new NoopHttpAdapter({}));
      });
    });
  });
  describe('mapToClass', () => {
    describe('when middleware is a class', () => {
      describe('when there is no excluded routes', () => {
        it('should return an identity', () => {
          const type = mapToClass(Test, [], noopAdapter);
          expect(type).to.eql(Test);
        });
      });
      describe('when there are excluded routes', () => {
        it('should return a host class', () => {
          const type = mapToClass(
            Test,
            mapToExcludeRoute([{ path: '*', method: RequestMethod.ALL }]),
            noopAdapter,
          );
          expect(type).to.not.eql(Test);
          expect(type.name).to.eql(Test.name);
        });
      });
    });
    describe('when middleware is a function', () => {
      it('should return a metatype', () => {
        const metatype = mapToClass(fnMiddleware, [], noopAdapter);
        expect(metatype).to.not.eql(fnMiddleware);
      });
      it('should define a `use` method', () => {
        const metatype = mapToClass(fnMiddleware, [], noopAdapter);
        expect(new metatype().use).to.exist;
      });
      it('should encapsulate a function', () => {
        const spy = sinon.spy();
        const metatype = mapToClass(spy, [], noopAdapter);
        new metatype().use();
        expect(spy.called).to.be.true;
      });
    });
  });
  describe('isMiddlewareClass', () => {
    describe('when middleware is a class', () => {
      it('should returns true', () => {
        expect(isMiddlewareClass(Test)).to.be.true;
      });
    });
    describe('when middleware is a function', () => {
      it('should returns false', () => {
        expect(isMiddlewareClass(fnMiddleware)).to.be.false;
      });
    });
  });
  describe('assignToken', () => {
    describe('should define `name` property on metatype', () => {
      const AnonymousType = class {};
      assignToken(AnonymousType);
      expect(AnonymousType.name).to.exist;
    });
    describe('should use passed token as `name`', () => {
      const AnonymousType = class {};
      const token = 'token';

      assignToken(AnonymousType, token);
      expect(AnonymousType.name).to.eq(token);
    });
  });

  describe('isRouteExcluded', () => {
    let adapter: NoopHttpAdapter;

    beforeEach(() => {
      adapter = new NoopHttpAdapter({});
      sinon.stub(adapter, 'getRequestMethod').callsFake(() => 'GET');
      sinon.stub(adapter, 'getRequestUrl').callsFake(() => '/cats/3');
    });
    describe('when route is excluded (new syntax *path)', () => {
      const path = '/cats/*path';
      const excludedRoutes = mapToExcludeRoute([
        {
          path,
          method: RequestMethod.GET,
        },
      ]);
      it('should return true', () => {
        expect(isMiddlewareRouteExcluded({}, excludedRoutes, adapter)).to.be
          .true;
      });
    });
    describe('when route is excluded (legacy syntax (.*))', () => {
      const path = '/cats/(.*)';
      const excludedRoutes = mapToExcludeRoute([
        {
          path,
          method: RequestMethod.GET,
        },
      ]);
      it('should return true', () => {
        expect(isMiddlewareRouteExcluded({}, excludedRoutes, adapter)).to.be
          .true;
      });
    });
    describe('when route is not excluded', () => {
      it('should return false', () => {
        expect(isMiddlewareRouteExcluded({}, [], adapter)).to.be.false;
      });
    });
    describe('when the request target is not a plain path', () => {
      const excludedRoutes = mapToExcludeRoute([
        'cats/:id/avatar',
        '*prefix/admin',
      ]);
      it('should return true for a path with a query string', () => {
        (adapter.getRequestUrl as sinon.SinonStub).callsFake(
          () => '/cats/3/avatar?size=1',
        );
        expect(isMiddlewareRouteExcluded({}, excludedRoutes, adapter)).to.be
          .true;
      });
      for (const url of [
        '/cats/3#/avatar',
        '/cats/3/avatar#',
        '/cats/3/avatar?size=1#',
        'http://localhost/admin',
      ]) {
        it(`should return false for ${JSON.stringify(url)}`, () => {
          (adapter.getRequestUrl as sinon.SinonStub).callsFake(() => url);
          expect(isMiddlewareRouteExcluded({}, excludedRoutes, adapter)).to.be
            .false;
        });
      }
    });
  });
});
