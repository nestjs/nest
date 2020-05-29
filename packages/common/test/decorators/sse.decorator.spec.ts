import { expect } from 'chai';
import { Sse } from '../../decorators/http/sse.decorator';
import {
  HTTP_CODE_METADATA,
  SSE_METADATA,
  PATH_METADATA,
  METHOD_METADATA,
} from '../../constants';
import { RequestMethod } from '../../enums/request-method.enum';

describe('@Sse', () => {
  const prefix = '/prefix';
  class Test {
    @Sse(prefix)
    public static test() {}
  }

  it('should enhance method with expected http status code', () => {
    const path = Reflect.getMetadata(PATH_METADATA, Test.test);
    expect(path).to.be.eql('/prefix');
    const method = Reflect.getMetadata(METHOD_METADATA, Test.test);
    expect(method).to.be.eql(RequestMethod.GET);
    const metadata = Reflect.getMetadata(SSE_METADATA, Test.test);
    expect(metadata).to.be.eql(true);
  });
});
