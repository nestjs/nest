import {
  METHOD_METADATA,
  PATH_METADATA,
  SSE_METADATA,
} from '../../constants.js';
import { Sse } from '../../decorators/http/sse.decorator.js';
import { RequestMethod } from '../../enums/request-method.enum.js';

describe('@Sse', () => {
  const prefix = '/prefix';
  class Test {
    @Sse(prefix)
    public static test() {}

    @Sse(prefix, { method: RequestMethod.POST })
    public static testUsingOptions() {}
  }

  it('should enhance method with expected http status code', () => {
    const path = Reflect.getMetadata(PATH_METADATA, Test.test);
    expect(path).toEqual('/prefix');

    const method = Reflect.getMetadata(METHOD_METADATA, Test.test);
    expect(method).toEqual(RequestMethod.GET);

    const metadata = Reflect.getMetadata(SSE_METADATA, Test.test);
    expect(metadata).toEqual(true);
  });
  it('should enhance method with expected http status code and method from options', () => {
    const path = Reflect.getMetadata(PATH_METADATA, Test.testUsingOptions);
    expect(path).toEqual('/prefix');

    const method = Reflect.getMetadata(METHOD_METADATA, Test.testUsingOptions);
    expect(method).toEqual(RequestMethod.POST);

    const metadata = Reflect.getMetadata(SSE_METADATA, Test.testUsingOptions);
    expect(metadata).toEqual(true);
  });

  it('should set path on "/" by default', () => {
    class TestWithoutPath {
      @Sse()
      public static test() {}

      @Sse('')
      public static testUsingEmptyPath() {}
    }

    const path = Reflect.getMetadata(PATH_METADATA, TestWithoutPath.test);
    expect(path).toEqual('/');

    const emptyPath = Reflect.getMetadata(
      PATH_METADATA,
      TestWithoutPath.testUsingEmptyPath,
    );
    expect(emptyPath).toEqual('/');
  });
});
