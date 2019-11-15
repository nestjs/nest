import { expect } from 'chai';
import { applyDecorators } from '../../decorators';

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
