import { expect } from 'chai';
import { SetMetadata } from '../../decorators/core/set-metadata.decorator';

describe('@SetMetadata', () => {
  const key = 'key',
    value = 'value';

  @SetMetadata(key, value)
  class Test {}

  class TestWithMethod {
    @SetMetadata(key, value)
    public static test() {}
  }

  it('should enhance class with expected metadata', () => {
    const metadata = Reflect.getMetadata(key, Test);
    expect(metadata).to.be.eql(value);
  });

  it('should enhance method with expected metadata', () => {
    const metadata = Reflect.getMetadata(key, TestWithMethod.test);
    expect(metadata).to.be.eql(value);
  });
});
