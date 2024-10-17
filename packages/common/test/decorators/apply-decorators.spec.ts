import { assert, expect } from 'chai';
import { applyDecorators, UseGuards } from '../../decorators';
import { GUARDS_METADATA } from '../../constants';
import { CanActivate } from '../../interfaces';

describe('when applyDecorators was not used', () => {
  it('should apply all method decorators', () => {
    testClassWithAppliedMethodDecorators(
      (
        successToken,
        {
          FailedExecutionsCounter,
          MethodCallingCounter,
          SuccessfulExecutionsCounter,
        },
      ) => {
        class Cat {
          @FailedExecutionsCounter
          @SuccessfulExecutionsCounter
          @MethodCallingCounter
          public action(doneCallback: () => void) {
            doneCallback();
            return successToken;
          }
        }
        return Cat;
      },
    );
  });

  it('should apply all class decorators', () => {
    const firstCounter = ClassInstantiationCounterDecoratorFactory();
    const secondCounter = ClassInstantiationCounterDecoratorFactory();

    @firstCounter.ClassInstantiationCounterDecorator
    @secondCounter.ClassInstantiationCounterDecorator
    class Frog {
      constructor(public readonly age: number) {}
    }

    const plannedInstantiations = getRandomInt(20);

    for (let i = 0; i < plannedInstantiations; i++) {
      const age = getRandomInt(100);
      const frog = new Frog(age);
      expect(frog).to.be.deep.equal(
        { age },
        'frog should have the same age as the one passed to the constructor',
      );
      assert(frog instanceof Frog, 'frog should be an instance of Frog');
    }
    expect(plannedInstantiations).to.be.equal(
      firstCounter.getInstantiationStats().timesInstantiated,
      'The amount of dog instantiations should be equal to the planned instantiations (1)',
    );
    expect(plannedInstantiations).to.be.equal(
      secondCounter.getInstantiationStats().timesInstantiated,
      'The amount of dog instantiations should be equal to the planned instantiations (2)',
    );
  });
});

describe('when applyDecorators was used', () => {
  it('should apply all method decorators', () => {
    testClassWithAppliedMethodDecorators(
      (
        successToken,
        {
          FailedExecutionsCounter,
          MethodCallingCounter,
          SuccessfulExecutionsCounter,
        },
      ) => {
        const AllKindsOfExecutionsCounterDecorator = applyDecorators(
          FailedExecutionsCounter,
          SuccessfulExecutionsCounter,
          MethodCallingCounter,
        );

        class Dog {
          @AllKindsOfExecutionsCounterDecorator
          public action(doneCallback: () => void) {
            doneCallback();
            return successToken;
          }
        }
        return Dog;
      },
    );
  });

  it('should apply all class decorators', () => {
    const firstCounter = ClassInstantiationCounterDecoratorFactory();
    const secondCounter = ClassInstantiationCounterDecoratorFactory();
    const thirdCounter = ClassInstantiationCounterDecoratorFactory();

    const TripleClassInstantiationCounterDecorator = () =>
      applyDecorators(
        firstCounter.ClassInstantiationCounterDecorator,
        secondCounter.ClassInstantiationCounterDecorator,
        thirdCounter.ClassInstantiationCounterDecorator,
      );

    @TripleClassInstantiationCounterDecorator()
    class Dog {
      constructor(public readonly speed: number) {}
    }

    const plannedInstantiations = getRandomInt(20);

    for (let i = 0; i < plannedInstantiations; i++) {
      const speed = getRandomInt(100);
      const dog = new Dog(speed);
      expect(dog).to.be.deep.equal(
        { speed },
        'Dog should have the same speed as the one passed to the constructor',
      );
      expect(dog).to.be.instanceOf(Dog);
    }
    expect(plannedInstantiations).to.be.equal(
      firstCounter.getInstantiationStats().timesInstantiated,
      'Amount of dog instantiations in the first counter should be equal to the planned instantiations',
    );
    expect(plannedInstantiations).to.be.equal(
      secondCounter.getInstantiationStats().timesInstantiated,
      'Amount of dog instantiations in the second counter should be equal to the planned instantiations',
    );
    expect(plannedInstantiations).to.be.equal(
      thirdCounter.getInstantiationStats().timesInstantiated,
      'Amount of dog instantiations in the third counter should be equal to the planned instantiations',
    );
  });
});

class Guard implements CanActivate {
  canActivate() {
    return true;
  }
}

const GuardCompositeDecorator = () => {
  return applyDecorators<MethodDecorator & ClassDecorator>(UseGuards(Guard));
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

// since js is parsed twice, we can use functions even before they were defined

function testClassWithAppliedMethodDecorators(
  createClassToTest: (
    successToken: Symbol,
    methodDecorators: {
      FailedExecutionsCounter: MethodDecorator;
      SuccessfulExecutionsCounter: MethodDecorator;
      MethodCallingCounter: MethodDecorator;
    },
  ) => new () => {
    action: (cb: () => void) => Symbol;
  },
) {
  const { FailedExecutionsCounter, getFailedStats } =
    FailedExecutionsCounterFactory();

  const { SuccessfulExecutionsCounter, getSuccessfulStats } =
    SuccessfulExecutionsCounterFactory();

  const { MethodCallingCounter, getExecutionStats } =
    AllExecutionsCounterDecoratorFactory();

  class BadSomethingError {}
  const successToken = Symbol('successToken');

  const ClassWithDecoratedMethod = createClassToTest(successToken, {
    FailedExecutionsCounter,
    SuccessfulExecutionsCounter,
    MethodCallingCounter,
  });
  const instance = new ClassWithDecoratedMethod();

  const plannedFails = getRandomInt(20);
  const plannedSuccesses = getRandomInt(20);
  const plannedRuns = plannedFails + plannedSuccesses;

  for (let i = 0; i < plannedSuccesses; i++) {
    try {
      const result = instance.action(() => {});
      expect(result).to.be.equal(
        successToken,
        'Result should be equal to successToken',
      );
    } catch (error) {
      assert(false, 'instance.action(...) should never throw');
    }
  }

  for (let i = 0; i < plannedFails; i++) {
    try {
      instance.action(() => {
        throw new BadSomethingError();
      });
      assert(false, 'instance.action(...) should never be successful');
    } catch (error) {
      expect(error).to.be.instanceOf(BadSomethingError);
    }
  }

  expect(getFailedStats().amountOfTimesWrappedFunctionFailed).to.be.equal(
    plannedFails,
  );
  expect(
    getSuccessfulStats().amountOfTimesWrappedFunctionFinishedSuccessfully,
  ).to.be.equal(plannedSuccesses);
  expect(getExecutionStats().amountOfTimesWrappedFunctionCalled).to.be.equal(
    plannedRuns,
  );
}

function FailedExecutionsCounterFactory() {
  let amountOfTimesWrappedFunctionFailed: number = 0;

  const FailedExecutionsCounter: MethodDecorator = <T>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>,
  ): void => {
    const originalMethod = descriptor.value as Function;
    descriptor.value = function (...args: any[]) {
      try {
        return originalMethod.apply(target, args);
      } catch (error) {
        amountOfTimesWrappedFunctionFailed += 1;
        throw error;
      }
    } as T;
  };

  return {
    FailedExecutionsCounter,
    getFailedStats: () => ({
      amountOfTimesWrappedFunctionFailed,
    }),
  };
}

function SuccessfulExecutionsCounterFactory() {
  let amountOfTimesWrappedFunctionFinishedSuccessfully: number = 0;

  const SuccessfulExecutionsCounter: MethodDecorator = <T>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>,
  ): void => {
    const originalMethod = descriptor.value as Function;
    descriptor.value = function (...args: any[]) {
      try {
        const result = originalMethod.apply(target, args);
        amountOfTimesWrappedFunctionFinishedSuccessfully += 1;
        return result;
      } catch (error) {
        throw error;
      }
    } as T;
  };

  return {
    SuccessfulExecutionsCounter,
    getSuccessfulStats: () => ({
      amountOfTimesWrappedFunctionFinishedSuccessfully,
    }),
  };
}

function AllExecutionsCounterDecoratorFactory() {
  let amountOfTimesWrappedFunctionCalled: number = 0;

  const MethodCallingCounter: MethodDecorator = <T>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>,
  ): void => {
    const originalMethod = descriptor.value as Function;
    descriptor.value = function (...args: any[]) {
      amountOfTimesWrappedFunctionCalled += 1;
      return originalMethod.apply(target, args);
    } as T;
  };

  return {
    MethodCallingCounter,
    getExecutionStats: () => ({
      amountOfTimesWrappedFunctionCalled,
    }),
  };
}

function ClassInstantiationCounterDecoratorFactory() {
  const stats = { timesInstantiated: 0 };

  // @ts-expect-error ClassDecorator is badly typed. It has generic extends Function, not a constructor signature like `new () => {}`. Also typescript right now cannot convert a class declaration to a constructor signature
  const ClassInstantiationCounterDecorator: ClassDecorator = <
    T extends Function,
  >(
    SourceClass: T,
  ) => {
    // @ts-expect-error ClassDecorator is badly typed (it has generic that extends Function, not a constructor signature like `new () => {}`)
    return class extends SourceClass {
      constructor(...args: any[]) {
        super(...args);
        stats.timesInstantiated += 1;
      }
    };
  };

  return {
    ClassInstantiationCounterDecorator,
    getInstantiationStats: () => stats,
  };
}

function getRandomInt(max: number) {
  return Math.floor(Math.random() * max);
}
