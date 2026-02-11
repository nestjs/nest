import { expect } from 'chai';
import { METHOD_METADATA, PATH_METADATA, SSE_METADATA } from '../../constants';
import { Sse } from '../../decorators/http/sse.decorator';
import { RequestMethod } from '../../enums/request-method.enum';

describe('@Sse', () => {
  const prefix = '/prefix';
  class Test {
    @Sse(prefix)
    public static test() {}

    @Sse(prefix, { method: RequestMethod.POST })
    public static testUsingOptions() {}

    @Sse(prefix, RequestMethod.POST)
    public static testUsingDirectMethod() {}

    @Sse(prefix, RequestMethod.PUT)
    public static testUsingPutMethod() {}

    @Sse(prefix, RequestMethod.PATCH)
    public static testUsingPatchMethod() {}
  }

  it('should enhance method with expected http status code', () => {
    const path = Reflect.getMetadata(PATH_METADATA, Test.test);
    expect(path).to.be.eql('/prefix');

    const method = Reflect.getMetadata(METHOD_METADATA, Test.test);
    expect(method).to.be.eql(RequestMethod.GET);

    const metadata = Reflect.getMetadata(SSE_METADATA, Test.test);
    expect(metadata).to.be.eql(true);
  });
  it('should enhance method with expected http status code and method from options', () => {
    const path = Reflect.getMetadata(PATH_METADATA, Test.testUsingOptions);
    expect(path).to.be.eql('/prefix');

    const method = Reflect.getMetadata(METHOD_METADATA, Test.testUsingOptions);
    expect(method).to.be.eql(RequestMethod.POST);

    const metadata = Reflect.getMetadata(SSE_METADATA, Test.testUsingOptions);
    expect(metadata).to.be.eql(true);
  });
  it('should accept method as direct parameter (new API)', () => {
    const path = Reflect.getMetadata(PATH_METADATA, Test.testUsingDirectMethod);
    expect(path).to.be.eql('/prefix');

    const method = Reflect.getMetadata(
      METHOD_METADATA,
      Test.testUsingDirectMethod,
    );
    expect(method).to.be.eql(RequestMethod.POST);

    const metadata = Reflect.getMetadata(
      SSE_METADATA,
      Test.testUsingDirectMethod,
    );
    expect(metadata).to.be.eql(true);
  });
  it('should support PUT method via direct parameter', () => {
    const method = Reflect.getMetadata(
      METHOD_METADATA,
      Test.testUsingPutMethod,
    );
    expect(method).to.be.eql(RequestMethod.PUT);
  });
  it('should support PATCH method via direct parameter', () => {
    const method = Reflect.getMetadata(
      METHOD_METADATA,
      Test.testUsingPatchMethod,
    );
    expect(method).to.be.eql(RequestMethod.PATCH);
  });
});
