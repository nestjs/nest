import { expect } from 'chai';

import { HTTP_CODE_METADATA } from '../../constants';
import { HttpCode } from '../../decorators/http/http-code.decorator';

describe('@HttpCode', () => {
  const httpCode = 200;
  class Test {
    @HttpCode(httpCode)
    public static test() {}
  }

  it('should enhance method with expected http status code', () => {
    const metadata = Reflect.getMetadata(HTTP_CODE_METADATA, Test.test);
    expect(metadata).to.be.eql(httpCode);
  });
});
