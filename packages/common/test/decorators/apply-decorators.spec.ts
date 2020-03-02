import { expect } from 'chai';
import { applyDecorators, UseGuards } from '../../decorators';
import { GUARDS_METADATA } from '../../constants';
import { CanActivate } from '../../interfaces';

describe('applyDecorators', () => {
  function testDecorator1(param: number) {
    return (target: any) => {
      target.myParam = param;
    };
  }

  function testDecorator2(param1: number, param2: number) {
    return (target: any) => {
      target.myParam = (target.myParam || 0) + param1;
      target.myParam2 = param2;
    };
  }

  function testDecorator3() {
    return (target: any) => {
      target.myParam3 = 0;
    };
  }

  it('should apply all decorators', () => {
    const testParams = {
      decorator1: { param: 1 },
      decorator2: { param1: 2, param2: 3 },
    };

    const decoratedTarget = {};
    testDecorator1(testParams.decorator1.param)(decoratedTarget);
    testDecorator2(
      testParams.decorator2.param1,
      testParams.decorator2.param2,
    )(decoratedTarget);
    testDecorator3()(decoratedTarget);

    const customDecoratedTarget = {};
    const customDecorator = applyDecorators(
      testDecorator1(testParams.decorator1.param),
      testDecorator2(
        testParams.decorator2.param1,
        testParams.decorator2.param2,
      ),
      testDecorator3(),
    );
    customDecorator(customDecoratedTarget);

    const expectedTarget = {
      myParam: testParams.decorator1.param + testParams.decorator2.param1,
      myParam2: testParams.decorator2.param2,
      myParam3: 0,
    };

    expect(decoratedTarget).to.be.deep.equal(expectedTarget);
    expect(customDecoratedTarget).to.be.deep.equal(expectedTarget);
  });
});

class Guard implements CanActivate {
  canActivate() {
    return true;
  }
}

const GuardCompositeDecorator = () => {
  return applyDecorators(UseGuards(Guard));
};

describe('applyDecorators @GuardCompositeDecorator', () => {
  @GuardCompositeDecorator()
  class Test {}

  class TestWithMethod {
    @GuardCompositeDecorator()
    public test() {
      return true;
    }
  }

  class TestWithStaticMethod {
    @GuardCompositeDecorator()
    public static test() {
      return true;
    }
  }

  it('should be using the guard defined on the class', () => {
    const classMetadata = Reflect.getMetadata(GUARDS_METADATA, Test);
    expect(classMetadata).to.deep.equal([Guard]);
  });

  it('should be using the guard defined on the prototype method', () => {
    const instance = new TestWithMethod();

    const classMetadata = Reflect.getMetadata(GUARDS_METADATA, TestWithMethod);
    const methodMetadata = Reflect.getMetadata(GUARDS_METADATA, instance.test);
    const instanceMetadata = Reflect.getMetadata(GUARDS_METADATA, instance);

    expect(classMetadata).to.be.undefined;
    expect(methodMetadata).to.deep.equal([Guard]);
    expect(instanceMetadata).to.be.undefined;
  });

  it('should be using the guard defined on the static method', () => {
    const classMetadata = Reflect.getMetadata(
      GUARDS_METADATA,
      TestWithStaticMethod,
    );
    const methodMetadata = Reflect.getMetadata(
      GUARDS_METADATA,
      TestWithStaticMethod.test,
    );

    expect(classMetadata).to.be.undefined;
    expect(methodMetadata).to.deep.equal([Guard]);
  });
});
