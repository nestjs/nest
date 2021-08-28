import { RequestMethod, Type } from '@nestjs/common';
import * as pathToRegexp from 'path-to-regexp';
import * as sinon from 'sinon';
import {
  assignToken,
  filterMiddleware,
  isMiddlewareClass,
  isRouteExcluded,
  mapToClass,
} from '../../middleware/utils';
import { NoopHttpAdapter } from '../utils/noop-adapter.spec';

describe('middleware utils', () => {
  const noopAdapter = new NoopHttpAdapter({});

  class Test {}
  function fnMiddleware(req, res, next) {}

  describe('filterMiddleware', () => {
    let middleware: any[];
    beforeEach(() => {
      middleware = [Test, fnMiddleware, undefined, null];
    });
    it('should return filtered middleware', () => {
      expect(filterMiddleware(middleware, [], noopAdapter).length).toBe(2);
    });
  });
  describe('mapToClass', () => {
    describe('when middleware is a class', () => {
      describe('when there is no excluded routes', () => {
        it('should return an identity', () => {
          const type = mapToClass(Test, [], noopAdapter);
          expect(type).toEqual(Test);
        });
      });
      describe('when there are excluded routes', () => {
        it('should return a host class', () => {
          const type = mapToClass(
            Test,
            [{ path: '*', method: RequestMethod.ALL, regex: /./ }],
            noopAdapter,
          );
          expect(type).not.toEqual(Test);
          expect(type.name).toEqual(Test.name);
        });
      });
    });
    describe('when middleware is a function', () => {
      it('should return a metatype', () => {
        const metatype = mapToClass(fnMiddleware, [], noopAdapter);
        expect(metatype).not.toEqual(fnMiddleware);
      });
      it('should define a `use` method', () => {
        const metatype = mapToClass(fnMiddleware, [], noopAdapter) as Type<any>;
        expect(new metatype().use).toBeDefined();
      });
      it('should encapsulate a function', () => {
        const spy = sinon.spy();
        const metatype = mapToClass(spy, [], noopAdapter) as Type<any>;
        new metatype().use();
        expect(spy.called).toBeTruthy();
      });
    });
  });
  describe('isMiddlewareClass', () => {
    describe('when middleware is a class', () => {
      it('should returns true', () => {
        expect(isMiddlewareClass(Test)).toBeTruthy();
      });
    });
    describe('when middleware is a function', () => {
      it('should returns false', () => {
        expect(isMiddlewareClass(fnMiddleware)).toBeFalsy();
      });
    });
  });
  describe('assignToken', () => {
    describe('should define `name` property on metatype', () => {
      const AnonymousType = class {};
      assignToken(AnonymousType);
      expect(AnonymousType.name).toBeDefined()
    });
    describe('should use passed token as `name`', () => {
      const AnonymousType = class {};
      const token = 'token';

      assignToken(AnonymousType, token);
      expect(AnonymousType.name).toBe(token);
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
      const excludedRoutes = [
        {
          path,
          method: RequestMethod.GET,
          regex: pathToRegexp(path),
        },
      ];
      it('should return true', () => {
        expect(isRouteExcluded({}, excludedRoutes, adapter)).toBeTruthy();
      });
    });
    describe('when route is not excluded', () => {
      it('should return false', () => {
        expect(isRouteExcluded({}, [], adapter)).toBeFalsy();
      });
    });
  });
});
