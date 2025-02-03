import { expect } from 'chai';
import { METHOD_METADATA, PATH_METADATA, SSE_METADATA } from '../../constants';
import { Sse } from '../../decorators/http/sse.decorator';
import { RequestMethod } from '../../enums/request-method.enum';

describe('@Sse', () => {
  const prefix = '/prefix';
  class Test {
    @Sse(prefix)
    public static test() {}

    @Sse(prefix, RequestMethod.POST)
    public static testPost() {}
  }

  it('should enhance method with expected http status code', () => {
    const path = Reflect.getMetadata(PATH_METADATA, Test.test);
    expect(path).to.be.eql('/prefix');

    const method = Reflect.getMetadata(METHOD_METADATA, Test.test);
    expect(method).to.be.eql(RequestMethod.GET);

    const metadata = Reflect.getMetadata(SSE_METADATA, Test.test);
    expect(metadata).to.be.eql(true);
  });

  it('should enhance method with expected http status code for custom request method', () => {
    const path = Reflect.getMetadata(PATH_METADATA, Test.testPost);
    expect(path).to.be.eql('/prefix');

    const method = Reflect.getMetadata(METHOD_METADATA, Test.testPost);
    expect(method).to.be.eql(RequestMethod.POST);

    const metadata = Reflect.getMetadata(SSE_METADATA, Test.testPost);
    expect(metadata).to.be.eql(true);
  });
});
