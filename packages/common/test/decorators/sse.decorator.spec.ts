import { expect } from 'chai';
import {
  METHOD_METADATA,
  PATH_METADATA,
  SSE_METADATA,
  SSE_OPTIONS_METADATA,
} from '../../constants';
import { Sse } from '../../decorators/http/sse.decorator';
import { RequestMethod } from '../../enums/request-method.enum';

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

  [1024, 0, Infinity].forEach(maxPendingDataLength => {
    it(`should enhance method with maxPendingDataLength ${maxPendingDataLength} from options`, () => {
      class TestWithLimit {
        @Sse(prefix, { maxPendingDataLength })
        public static test() {}
      }

      const options = Reflect.getMetadata(
        SSE_OPTIONS_METADATA,
        TestWithLimit.test,
      );
      expect(options).to.be.eql({ maxPendingDataLength });
    });
  });

  it('should keep GET as the method when the options do not set one', () => {
    class TestWithLimit {
      @Sse(prefix, { maxPendingDataLength: 1024 })
      public static test() {}
    }

    const method = Reflect.getMetadata(METHOD_METADATA, TestWithLimit.test);
    expect(method).to.be.eql(RequestMethod.GET);
  });
});
