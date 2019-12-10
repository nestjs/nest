import { expect } from 'chai';
import { UseInterceptors } from '../../decorators/core/use-interceptors.decorator';
import { INTERCEPTORS_METADATA } from '../../constants';
import { InvalidDecoratorItemException } from '../../utils/validate-each.util';

class Interceptor {}

describe('@UseInterceptors', () => {
  const interceptors = [Interceptor, Interceptor];

  @UseInterceptors(...(interceptors as any))
  class Test {}

  class TestWithMethod {
    @UseInterceptors(...(interceptors as any))
    public static test() {}
  }

  it('should enhance class with expected interceptors array', () => {
    const metadata = Reflect.getMetadata(INTERCEPTORS_METADATA, Test);
    expect(metadata).to.be.eql(interceptors);
  });

  it('should enhance method with expected interceptors array', () => {
    const metadata = Reflect.getMetadata(
      INTERCEPTORS_METADATA,
      TestWithMethod.test,
    );
    expect(metadata).to.be.eql(interceptors);
  });

  it('when object is invalid should throw exception', () => {
    let error = undefined;
    try {
      UseInterceptors('test' as any)({ name: 'target' });
    } catch (e) {
      error = e;
    }
    expect(error).to.be.instanceof(InvalidDecoratorItemException);
  });

  it('when object is valid should not throw exception', () => {
    let error = undefined;
    try {
      UseInterceptors({
        intercept() {
          return null;
        },
      })({ name: 'target' });
    } catch (e) {
      error = e;
    }
    expect(error).to.be.undefined;
  });
});
