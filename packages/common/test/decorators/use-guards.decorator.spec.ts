import { expect } from 'chai';
import { GUARDS_METADATA } from '../../constants';
import { UseGuards } from '../../decorators/core/use-guards.decorator';
import { InvalidDecoratorItemException } from '../../utils/validate-each.util';

class Guard {}

describe('@UseGuards', () => {
  const guards = [Guard, Guard];

  @UseGuards(...(guards as any))
  class Test {}

  class TestWithMethod {
    @UseGuards(...(guards as any))
    public static test() {}
  }

  class Test2 {
    @UseGuards(...(guards as any))
    @UseGuards(...(guards as any))
    public static test() {}
  }

  it('should enhance class with expected guards array', () => {
    const metadata = Reflect.getMetadata(GUARDS_METADATA, Test);
    expect(metadata).to.be.eql(guards);
  });

  it('should enhance method with expected guards array', () => {
    const metadata = Reflect.getMetadata(GUARDS_METADATA, TestWithMethod.test);
    expect(metadata).to.be.eql(guards);
  });

  it('should enhance class with multiple guards array', () => {
    const metadata = Reflect.getMetadata(GUARDS_METADATA, Test2.test);
    expect(metadata).to.be.eql(guards.concat(guards));
  });

  it('when object is invalid should throw exception', () => {
    try {
      UseGuards('test' as any)(() => {});
    } catch (e) {
      expect(e).to.be.instanceof(InvalidDecoratorItemException);
    }
  });
});
