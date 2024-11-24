import { RequestMethod, Type } from '@nestjs/common';
import { addLeadingSlash } from '@nestjs/common/utils/shared.utils';
import { expect } from 'chai';
import * as pathToRegexp from 'path-to-regexp';
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
          pathRegex: pathToRegexp(addLeadingSlash(stringRoute)),
        },
        {
          path: routeInfo.path,
          requestMethod: routeInfo.method,
          pathRegex: pathToRegexp(addLeadingSlash(routeInfo.path)),
        },
      ]);
    });
  });
  describe('filterMiddleware', () => {
    let middleware: any[];
    beforeEach(() => {
      middleware = [Test, fnMiddleware, undefined, null];
    });
    it('should return filtered middleware', () => {
      expect(filterMiddleware(middleware, [], [], noopAdapter)).to.have.length(
        2,
      );
    });
  });
  describe('mapToClass', () => {
    describe('when middleware is a class', () => {
      describe('when there is no excluded routes', () => {
        it('should return an identity', () => {
          const type = mapToClass(Test, [], [], noopAdapter);
          expect(type).to.eql(Test);
        });
      });
      describe('when there are excluded routes', () => {
        it('should return a host class', () => {
          const type = mapToClass(
            Test,
            [],
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
        const metatype = mapToClass(fnMiddleware, [], [], noopAdapter);
        expect(metatype).to.not.eql(fnMiddleware);
      });
      it('should define a `use` method', () => {
        const metatype = mapToClass(
          fnMiddleware,
          [],
          [],
          noopAdapter,
        ) as Type<any>;
        expect(new metatype().use).to.exist;
      });
      it('should encapsulate a function', () => {
        const spy = sinon.spy();
        const metatype = mapToClass(spy, [], [], noopAdapter) as Type<any>;
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

  describe('isMiddlewareRouteExcluded', () => {
    let adapter: NoopHttpAdapter;

    beforeEach(() => {
      adapter = new NoopHttpAdapter({});
      sinon.stub(adapter, 'getRequestMethod').callsFake(() => 'GET');
      sinon.stub(adapter, 'getRequestUrl').callsFake(() => '/cats/3');
    });

    describe('when route is excluded', () => {
      const path = '/cats/(.*)';
      const excludedRoutes = mapToExcludeRoute([
        {
          path,
          method: RequestMethod.GET,
        },
      ]);
      it('should return true', () => {
        expect(isMiddlewareRouteExcluded({}, [], excludedRoutes, adapter)).to.be
          .true;
      });
    });

    describe('when route is not excluded', () => {
      it('should return false', () => {
        expect(isMiddlewareRouteExcluded({}, [], [], adapter)).to.be.false;
      });
    });

    describe('when using regex pattern exclusion', () => {
      beforeEach(() => {
        (adapter.getRequestUrl as sinon.SinonStub).callsFake(() => '/cats/123');
      });

      it('should exclude numeric ids', () => {
        const excludedRoutes = mapToExcludeRoute([
          { path: '/cats/:id(\\d+)', method: RequestMethod.GET },
        ]);
        expect(isMiddlewareRouteExcluded({}, [], excludedRoutes, adapter)).to.be
          .true;
      });

      it('should not exclude non-numeric ids', () => {
        (adapter.getRequestUrl as sinon.SinonStub).callsFake(() => '/cats/abc');
        const excludedRoutes = mapToExcludeRoute([
          { path: '/cats/:id(\\d+)', method: RequestMethod.GET },
        ]);
        expect(isMiddlewareRouteExcluded({}, [], excludedRoutes, adapter)).to.be
          .false;
      });
    });

    describe('when using different HTTP methods', () => {
      const path = '/cats/(.*)';

      it('should exclude when methods match', () => {
        (adapter.getRequestMethod as sinon.SinonStub).callsFake(() => 'POST');
        const excludedRoutes = mapToExcludeRoute([
          { path, method: RequestMethod.POST },
        ]);
        expect(isMiddlewareRouteExcluded({}, [], excludedRoutes, adapter)).to.be
          .true;
      });

      it('should not exclude when methods differ', () => {
        (adapter.getRequestMethod as sinon.SinonStub).callsFake(() => 'POST');
        const excludedRoutes = mapToExcludeRoute([
          { path, method: RequestMethod.GET },
        ]);
        expect(isMiddlewareRouteExcluded({}, [], excludedRoutes, adapter)).to.be
          .false;
      });

      it('should exclude when method is ALL', () => {
        (adapter.getRequestMethod as sinon.SinonStub).callsFake(() => 'DELETE');
        const excludedRoutes = mapToExcludeRoute([
          { path, method: RequestMethod.ALL },
        ]);
        expect(isMiddlewareRouteExcluded({}, [], excludedRoutes, adapter)).to.be
          .true;
      });
    });

    describe('when using query parameters', () => {
      it('should exclude matching base path regardless of query params', () => {
        (adapter.getRequestUrl as sinon.SinonStub).callsFake(
          () => '/cats/3?page=1&limit=10',
        );
        const excludedRoutes = mapToExcludeRoute([
          { path: '/cats/:id', method: RequestMethod.GET },
        ]);
        expect(isMiddlewareRouteExcluded({}, [], excludedRoutes, adapter)).to.be
          .true;
      });
    });

    describe('when using included routes', () => {
      describe('with static routes', () => {
        beforeEach(() => {
          (adapter.getRequestUrl as sinon.SinonStub).callsFake(() => '/cats');
        });

        it('should not exclude when path matches included static route', () => {
          const includedRoutes = mapToExcludeRoute([
            { path: '/cats', method: RequestMethod.GET },
          ]);
          const excludedRoutes = mapToExcludeRoute([
            { path: '/cats', method: RequestMethod.GET },
          ]);
          expect(
            isMiddlewareRouteExcluded(
              {},
              includedRoutes,
              excludedRoutes,
              adapter,
            ),
          ).to.be.false;
        });

        it('should exclude when path does not match included static route', () => {
          (adapter.getRequestUrl as sinon.SinonStub).callsFake(() => '/dogs');
          const includedRoutes = mapToExcludeRoute([
            { path: '/cats', method: RequestMethod.GET },
          ]);
          const excludedRoutes = mapToExcludeRoute([
            { path: '/dogs', method: RequestMethod.GET },
          ]);
          expect(
            isMiddlewareRouteExcluded(
              {},
              includedRoutes,
              excludedRoutes,
              adapter,
            ),
          ).to.be.true;
        });

        it('should handle multiple static routes', () => {
          const includedRoutes = mapToExcludeRoute([
            { path: '/cats', method: RequestMethod.GET },
            { path: '/dogs', method: RequestMethod.GET },
          ]);
          const excludedRoutes = mapToExcludeRoute([
            { path: '/cats', method: RequestMethod.GET },
          ]);
          expect(
            isMiddlewareRouteExcluded(
              {},
              includedRoutes,
              excludedRoutes,
              adapter,
            ),
          ).to.be.false;
        });
      });

      describe('with mixed static and dynamic routes', () => {
        it('should prioritize static route inclusion over dynamic exclusion', () => {
          (adapter.getRequestUrl as sinon.SinonStub).callsFake(() => '/cats');
          const includedRoutes = mapToExcludeRoute([
            { path: '/cats', method: RequestMethod.GET }, // static route
          ]);
          const excludedRoutes = mapToExcludeRoute([
            { path: '/:any', method: RequestMethod.GET }, // dynamic route
          ]);
          expect(
            isMiddlewareRouteExcluded(
              {},
              includedRoutes,
              excludedRoutes,
              adapter,
            ),
          ).to.be.false;
        });

        it('should handle static sub-paths', () => {
          (adapter.getRequestUrl as sinon.SinonStub).callsFake(
            () => '/cats/details',
          );
          const includedRoutes = mapToExcludeRoute([
            { path: '/cats/details', method: RequestMethod.GET }, // static sub-path
          ]);
          const excludedRoutes = mapToExcludeRoute([
            { path: '/cats/:action', method: RequestMethod.GET }, // dynamic route
          ]);
          expect(
            isMiddlewareRouteExcluded(
              {},
              includedRoutes,
              excludedRoutes,
              adapter,
            ),
          ).to.be.false;
        });
      });

      describe('with dynamic routes', () => {
        beforeEach(() => {
          (adapter.getRequestUrl as sinon.SinonStub).callsFake(
            () => '/cats/123',
          );
        });

        it('should not exclude when path is in included routes', () => {
          const includedRoutes = mapToExcludeRoute([
            { path: '/cats/:id', method: RequestMethod.GET },
          ]);
          const excludedRoutes = mapToExcludeRoute([
            { path: '/cats/:id', method: RequestMethod.GET },
          ]);
          expect(
            isMiddlewareRouteExcluded(
              {},
              includedRoutes,
              excludedRoutes,
              adapter,
            ),
          ).to.be.false;
        });

        it('should exclude when path matches excluded but not included', () => {
          const includedRoutes = mapToExcludeRoute([
            { path: '/dogs/:id', method: RequestMethod.GET },
          ]);
          const excludedRoutes = mapToExcludeRoute([
            { path: '/cats/:id', method: RequestMethod.GET },
          ]);
          expect(
            isMiddlewareRouteExcluded(
              {},
              includedRoutes,
              excludedRoutes,
              adapter,
            ),
          ).to.be.true;
        });

        it('should handle method-specific inclusions', () => {
          (adapter.getRequestMethod as sinon.SinonStub).callsFake(() => 'POST');
          const includedRoutes = mapToExcludeRoute([
            { path: '/cats/:id', method: RequestMethod.GET },
          ]);
          const excludedRoutes = mapToExcludeRoute([
            { path: '/cats/:id', method: RequestMethod.POST },
          ]);
          expect(
            isMiddlewareRouteExcluded(
              {},
              includedRoutes,
              excludedRoutes,
              adapter,
            ),
          ).to.be.true;
        });
      });
    });
  });
});
