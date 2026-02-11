import { FASTIFY_ROUTE_SCHEMA_METADATA } from '../../constants.js';
import { RouteSchema } from '../../decorators/route-schema.decorator.js';

describe('@RouteSchema', () => {
  const routeSchema = { body: 'testValue' };
  class Test {
    config;
    @RouteSchema(routeSchema)
    public static test() {}
  }

  it('should enhance method with expected fastify route schema', () => {
    const path = Reflect.getMetadata(FASTIFY_ROUTE_SCHEMA_METADATA, Test.test);
    expect(path).toEqual(routeSchema);
  });
});
