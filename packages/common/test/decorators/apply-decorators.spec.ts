import { GUARDS_METADATA } from '../../constants.js';
import {
  applyDecorators,
  SetMetadata,
  UseGuards,
} from '../../decorators/index.js';
import { CanActivate } from '../../interfaces/index.js';

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

    expect(decoratedTarget).toEqual(expectedTarget);
    expect(customDecoratedTarget).toEqual(expectedTarget);
  });

  describe('when a decorator returns a value', () => {
    const wrap =
      (prefix: string): MethodDecorator =>
      (target, key, descriptor: TypedPropertyDescriptor<any>) => ({
        ...descriptor,
        value: function (...args: unknown[]) {
          return prefix + descriptor.value.apply(this, args);
        },
      });

    it('should replace the method with the descriptor a method decorator returns', () => {
      class Direct {
        @wrap('wrapped:')
        test() {
          return 'test';
        }
      }
      class Composed {
        @applyDecorators(wrap('wrapped:'))
        test() {
          return 'test';
        }
      }

      expect(new Direct().test()).toBe('wrapped:test');
      expect(new Composed().test()).toBe('wrapped:test');
    });

    it('should pass the descriptor a method decorator returns to the next decorator', () => {
      class Composed {
        @applyDecorators(wrap('first:'), wrap('second:'))
        test() {
          return 'test';
        }
      }

      expect(new Composed().test()).toBe('second:first:test');
    });

    it('should replace the class with the one a class decorator returns', () => {
      const replace: ClassDecorator = (target: any) =>
        class extends target {
          replaced = true;
        } as any;

      @replace
      class Direct {}
      @applyDecorators(replace)
      class Composed {}

      expect(new Direct()).toHaveProperty('replaced', true);
      expect(new Composed()).toHaveProperty('replaced', true);
    });
  });

  it('should leave a property as it is when a decorator returns the target', () => {
    class Dto {
      @applyDecorators(SetMetadata('a', 1))
      x = 5;
    }

    expect(Object.getOwnPropertyDescriptor(Dto.prototype, 'x')).toBeUndefined();
    expect(new Dto().x).toBe(5);
    expect(Reflect.getMetadata('a', Dto.prototype)).toBe(1);
  });

  it('should pass the key of a static property to a property decorator', () => {
    const calls: Array<[unknown, string | symbol | undefined]> = [];
    const record: PropertyDecorator = (target, key) => {
      calls.push([target, key]);
    };

    class Test {
      @applyDecorators(record)
      static staticProperty: number;

      @applyDecorators(record)
      instanceProperty: number;
    }

    expect(calls).toEqual([
      [Test, 'staticProperty'],
      [Test.prototype, 'instanceProperty'],
    ]);
  });

  it('should pass the index of a parameter to a parameter decorator', () => {
    const calls: Array<[unknown, string | symbol | undefined, number]> = [];
    const record: ParameterDecorator = (target, key, index) => {
      calls.push([target, key, index]);
    };
    const composed = applyDecorators(record);

    class Test {
      constructor(@composed first: string, @composed second: string) {}

      method(@composed value: string) {}
    }

    expect(calls).toEqual(
      expect.arrayContaining([
        [Test, undefined, 0],
        [Test, undefined, 1],
        [Test.prototype, 'method', 0],
      ]),
    );
    expect(calls).toHaveLength(3);
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
    expect(classMetadata).toEqual([Guard]);
  });

  it('should be using the guard defined on the prototype method', () => {
    const instance = new TestWithMethod();

    const classMetadata = Reflect.getMetadata(GUARDS_METADATA, TestWithMethod);
    const methodMetadata = Reflect.getMetadata(GUARDS_METADATA, instance.test);
    const instanceMetadata = Reflect.getMetadata(GUARDS_METADATA, instance);

    expect(classMetadata).toBeUndefined();
    expect(methodMetadata).toEqual([Guard]);
    expect(instanceMetadata).toBeUndefined();
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

    expect(classMetadata).toBeUndefined();
    expect(methodMetadata).toEqual([Guard]);
  });
});
