import { RequestMethod } from '@nestjs/common';
import { expect } from 'chai';
import { mapToExcludeRoute } from '../../../middleware/utils';
import {
  isMethodMatch,
  isRequestMethodAll,
  isRouteExcluded,
} from '../../../router/utils/exclude-route.util';

describe('exclude-route.util', () => {
  describe('isRequestMethodAll', () => {
    it('should return true for RequestMethod.ALL', () => {
      expect(isRequestMethodAll(RequestMethod.ALL)).to.be.true;
    });

    it('should return true for -1', () => {
      expect(isRequestMethodAll(RequestMethod.ALL)).to.be.true;
    });

    it('should return false for other methods', () => {
      expect(isRequestMethodAll(RequestMethod.GET)).to.be.false;
      expect(isRequestMethodAll(RequestMethod.POST)).to.be.false;
      expect(isRequestMethodAll(RequestMethod.DELETE)).to.be.false;
    });
  });

  describe('isMethodMatch', () => {
    it('should match when routeMethod is RequestMethod.ALL', () => {
      expect(isMethodMatch(RequestMethod.ALL, RequestMethod.GET)).to.be.true;
      expect(isMethodMatch(RequestMethod.ALL, RequestMethod.POST)).to.be.true;
      expect(isMethodMatch(RequestMethod.ALL, RequestMethod.DELETE)).to.be.true;
    });

    it('should match when methods are the same', () => {
      expect(isMethodMatch(RequestMethod.GET, RequestMethod.GET)).to.be.true;
      expect(isMethodMatch(RequestMethod.POST, RequestMethod.POST)).to.be.true;
      expect(isMethodMatch(RequestMethod.DELETE, RequestMethod.DELETE)).to.be
        .true;
    });

    it('should not match when methods are different', () => {
      expect(isMethodMatch(RequestMethod.GET, RequestMethod.POST)).to.be.false;
      expect(isMethodMatch(RequestMethod.POST, RequestMethod.GET)).to.be.false;
      expect(isMethodMatch(RequestMethod.DELETE, RequestMethod.GET)).to.be
        .false;
    });

    it('should handle undefined requestMethod', () => {
      expect(isMethodMatch(RequestMethod.ALL, undefined)).to.be.true;
      expect(isMethodMatch(RequestMethod.GET, undefined)).to.be.false;
    });
  });

  describe('isRouteExcluded', () => {
    describe('with static routes', () => {
      it('should match exact paths', () => {
        const excludedRoutes = mapToExcludeRoute([
          { path: '/cats', method: RequestMethod.GET },
        ]);
        expect(isRouteExcluded(excludedRoutes, '/cats', RequestMethod.GET)).to
          .be.true;
      });

      it('should not match different paths', () => {
        const excludedRoutes = mapToExcludeRoute([
          { path: '/cats', method: RequestMethod.GET },
        ]);
        expect(isRouteExcluded(excludedRoutes, '/dogs', RequestMethod.GET)).to
          .be.false;
      });

      it('should respect HTTP method', () => {
        const excludedRoutes = mapToExcludeRoute([
          { path: '/cats', method: RequestMethod.GET },
        ]);
        expect(isRouteExcluded(excludedRoutes, '/cats', RequestMethod.POST)).to
          .be.false;
      });

      it('should match any method when using RequestMethod.ALL', () => {
        const excludedRoutes = mapToExcludeRoute([
          { path: '/cats', method: RequestMethod.ALL },
        ]);
        expect(isRouteExcluded(excludedRoutes, '/cats', RequestMethod.GET)).to
          .be.true;
        expect(isRouteExcluded(excludedRoutes, '/cats', RequestMethod.POST)).to
          .be.true;
      });
    });

    describe('with dynamic routes', () => {
      it('should match parameterized paths', () => {
        const excludedRoutes = mapToExcludeRoute([
          { path: '/cats/:id', method: RequestMethod.GET },
        ]);
        expect(isRouteExcluded(excludedRoutes, '/cats/123', RequestMethod.GET))
          .to.be.true;
        expect(isRouteExcluded(excludedRoutes, '/cats/abc', RequestMethod.GET))
          .to.be.true;
      });

      it('should match regex patterns', () => {
        const excludedRoutes = mapToExcludeRoute([
          { path: '/cats/:id(\\d+)', method: RequestMethod.GET },
        ]);
        expect(isRouteExcluded(excludedRoutes, '/cats/123', RequestMethod.GET))
          .to.be.true;
        expect(isRouteExcluded(excludedRoutes, '/cats/abc', RequestMethod.GET))
          .to.be.false;
      });

      it('should match wildcard patterns', () => {
        const excludedRoutes = mapToExcludeRoute([
          { path: '/cats/(.*)', method: RequestMethod.GET },
        ]);
        expect(isRouteExcluded(excludedRoutes, '/cats/123', RequestMethod.GET))
          .to.be.true;
        expect(
          isRouteExcluded(excludedRoutes, '/cats/details', RequestMethod.GET),
        ).to.be.true;
      });
    });
  });
});
