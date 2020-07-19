import { expect } from 'chai';
import { WithAlias } from '../../decorators/http/route-alias.decorator';
import { ROUTE_ALIAS_METADATA } from '../../constants';

describe('@WithAlias', () => {
  const alias = 'alias';

  class Test {
    @WithAlias(alias)
    public static test() {}
  }

  it('should enhance method with expected alias string', () => {
    const metadata = Reflect.getMetadata(ROUTE_ALIAS_METADATA, Test.test);
    expect(metadata).to.be.eql(alias);
  });
});
