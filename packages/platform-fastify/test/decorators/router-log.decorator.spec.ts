import { expect } from 'chai';
import { FASTIFY_ROUTE_LOG_METADATA } from '../../constants';
import { RouteLog } from '../../decorators/route-log.decorator';

describe('@RouteConfig', () => {
  const routeConfig = { logLevel: 'debug' };
  class Test {
    config;
    @RouteLog(routeConfig)
    public static test() {}
  }

  it('should enhance method with expected fastify route config', () => {
    const path = Reflect.getMetadata(FASTIFY_ROUTE_LOG_METADATA, Test.test);
    expect(path).to.be.eql(routeConfig);
  });
});
