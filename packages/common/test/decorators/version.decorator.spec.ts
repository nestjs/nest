import { expect } from 'chai';
import { VERSION_METADATA } from '../../constants';
import { Version } from '../../decorators/core/version.decorator';

describe('@Version', () => {
  const version = '1';

  class Test {
    @Version(version)
    public static test() {}
  }

  it('should enhance method with expected version string', () => {
    const metadata = Reflect.getMetadata(VERSION_METADATA, Test.test);
    expect(metadata).to.be.eql(version);
  });
});
