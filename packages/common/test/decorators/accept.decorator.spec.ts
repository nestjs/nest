import { expect } from 'chai';
import { Accept } from '../../decorators/http';
import { ACCEPT_METADATA } from '../../constants';

describe('@Accept', () => {
  class Test {
    @Accept('application/json')
    public static test() {}
  }

  it('should enhance method with expected template string', () => {
    const metadata = Reflect.getMetadata(ACCEPT_METADATA, Test.test);
    expect(metadata).to.be.eql([{ heading: 'application/json' }]);
  });
});
