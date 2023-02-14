import { RequestMethod, Type } from '@nestjs/common';
import { addLeadingSlash } from '@nestjs/common/utils/shared.utils';
import { expect } from 'chai';
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
import * as pathToRegexp from 'path-to-regexp';

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
      expect(filterMiddleware(middleware, [], noopAdapter)).to.have.length(2);
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
        const metatype = mapToClass(fnMiddleware, [], noopAdapter) as Type<any>;
        expect(new metatype().use).to.exist;
      });
      it('should encapsulate a function', () => {
        const spy = sinon.spy();
        const metatype = mapToClass(spy, [], noopAdapter) as Type<any>;
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
    describe('when route is excluded', () => {
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
  });
});
