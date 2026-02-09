import { expect } from 'chai';
import { FASTIFY_ROUTE_CONSTRAINTS_METADATA } from '../../constants.js';
import { RouteConstraints } from '../../decorators/route-constraints.decorator.js';

describe('@RouteConstraints', () => {
  describe('has version constraints', () => {
    const routeConstraints = { version: '1.2.x' };
    class TestVersionConstraints {
      config;
      @RouteConstraints(routeConstraints)
      public static test() {}
    }

    it('should have a version constraint', () => {
      const path = Reflect.getMetadata(
        FASTIFY_ROUTE_CONSTRAINTS_METADATA,
        TestVersionConstraints.test,
      );
      expect(path).to.be.eql(routeConstraints);
    });
  });

  describe('has custom constraints', () => {
    const customRouteConstraints = { something: 'foo' };
    class TestConstraints {
      config;
      @RouteConstraints(customRouteConstraints)
      public static test() {}
    }

    it('should set a custom constraint', () => {
      const path = Reflect.getMetadata(
        FASTIFY_ROUTE_CONSTRAINTS_METADATA,
        TestConstraints.test,
      );
      expect(path).to.be.eql(customRouteConstraints);
    });
  });
});
