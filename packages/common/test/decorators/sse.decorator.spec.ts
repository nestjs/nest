import { expect } from 'chai';
import { Sse } from '../../decorators/http/sse.decorator';
import { HTTP_CODE_METADATA, SSE_METADATA } from '../../constants';

describe('@Sse', () => {
  const prefix = '/prefix';
  class Test {
    @Sse(prefix)
    public static test() {}
  }

  it('should enhance method with expected http status code', () => {
    const metadata = Reflect.getMetadata(SSE_METADATA, Test.test);
    expect(metadata).to.be.eql(prefix);
  });
});
