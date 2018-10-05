import { expect } from 'chai';
import { Redirect } from '../../decorators/http/redirect.decorator';
import { REDIRECT_METADATA } from '../../constants';

describe('@Redirect', () => {
  const url = 'http://test.com';

  class Test {
    @Redirect(url)
    public static test() {}
  }

  it('should enhance method with expected template string', () => {
    const metadata = Reflect.getMetadata(REDIRECT_METADATA, Test.test);
    expect(metadata).to.be.eql(url);
  });
});
