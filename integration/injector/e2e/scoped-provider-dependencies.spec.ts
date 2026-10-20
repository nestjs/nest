import {
  Controller,
  forwardRef,
  Inject,
  Injectable,
  Module,
  Optional,
  Scope,
} from '@nestjs/common';
import type { Provider, Type } from '@nestjs/common';
import { NestFactory, REQUEST, INQUIRER } from '@nestjs/core';
import { UnknownDependenciesException } from '@nestjs/core/errors/exceptions/unknown-dependencies.exception.js';
import { Test } from '@nestjs/testing';

@Injectable()
class MissingDependency {}

const compile = (providers: Provider[], imports: Type[] = []) =>
  Test.createTestingModule({ providers, imports }).compile();

describe('Dependencies of request-scoped and transient providers', () => {
  it.each([
    ['request-scoped', Scope.REQUEST],
    ['transient', Scope.TRANSIENT],
  ])(
    'should fail at bootstrap when a constructor dependency of a %s provider is missing',
    async (_, scope) => {
      @Injectable({ scope })
      class NeedsMissing {
        constructor(public readonly dep: MissingDependency) {}
      }

      await expect(compile([NeedsMissing])).rejects.toThrow(
        UnknownDependenciesException,
      );
    },
  );

  it('should fail at bootstrap when a property dependency is missing', async () => {
    @Injectable({ scope: Scope.REQUEST })
    class NeedsMissing {
      @Inject(MissingDependency)
      public readonly dep: MissingDependency;
    }

    await expect(compile([NeedsMissing])).rejects.toThrow(
      UnknownDependenciesException,
    );
  });

  it('should fail at bootstrap when a dependency of a request-scoped factory provider is missing', async () => {
    await expect(
      compile([
        {
          provide: 'NEEDS_MISSING',
          useFactory: (dep: MissingDependency) => ({ dep }),
          inject: [MissingDependency],
          scope: Scope.REQUEST,
        },
      ]),
    ).rejects.toThrow(UnknownDependenciesException);
  });

  it('should fail at bootstrap with NestFactory too', async () => {
    @Injectable({ scope: Scope.REQUEST })
    class NeedsMissing {
      constructor(public readonly dep: MissingDependency) {}
    }

    @Module({ providers: [NeedsMissing] })
    class AppModule {}

    await expect(
      NestFactory.createApplicationContext(AppModule, {
        abortOnError: false,
        logger: false,
      }),
    ).rejects.toThrow(UnknownDependenciesException);
  });

  it('should bootstrap when the missing dependencies are optional', async () => {
    @Injectable({ scope: Scope.REQUEST })
    class OptionalDeps {
      @Optional()
      @Inject(MissingDependency)
      public readonly property?: MissingDependency;

      constructor(@Optional() public readonly dep?: MissingDependency) {}
    }

    const module = await compile([
      OptionalDeps,
      {
        provide: 'OPTIONAL_FACTORY',
        useFactory: (dep?: MissingDependency) => ({ dep }),
        inject: [{ token: MissingDependency, optional: true }],
        scope: Scope.REQUEST,
      },
    ]);

    const instance = await module.resolve(OptionalDeps);
    expect(instance.dep).toBeUndefined();
    expect(instance.property).toBeUndefined();
    await expect(module.resolve('OPTIONAL_FACTORY')).resolves.toEqual({
      dep: undefined,
    });
  });

  it('should bootstrap when the dependencies are the request, the inquirer or a forward reference', async () => {
    @Injectable({ scope: Scope.TRANSIENT })
    class TransientWithInquirer {
      constructor(@Inject(INQUIRER) public readonly inquirer: unknown) {}
    }

    @Injectable({ scope: Scope.REQUEST })
    class Consumer {
      constructor(
        @Inject(REQUEST) public readonly request: unknown,
        public readonly transient: TransientWithInquirer,
        @Inject(forwardRef(() => Dependency))
        public readonly dependency: unknown,
      ) {}
    }

    @Injectable()
    class Dependency {}

    const module = await compile([Consumer, TransientWithInquirer, Dependency]);

    const instance = await module.resolve(Consumer);
    expect(instance.transient).toBeInstanceOf(TransientWithInquirer);
    expect(instance.dependency).toBeInstanceOf(Dependency);
  });

  it('should bootstrap when a dependency comes from an imported module', async () => {
    @Injectable()
    class SharedDependency {}

    @Module({ providers: [SharedDependency], exports: [SharedDependency] })
    class SharedModule {}

    @Injectable({ scope: Scope.REQUEST })
    class Consumer {
      constructor(public readonly dep: SharedDependency) {}
    }

    const module = await compile([Consumer], [SharedModule]);

    const instance = await module.resolve(Consumer);
    expect(instance.dep).toBeInstanceOf(SharedDependency);
  });

  it('should still fail at bootstrap for a request-scoped controller', async () => {
    @Controller({ scope: Scope.REQUEST })
    class ScopedController {
      constructor(public readonly dep: MissingDependency) {}
    }

    await expect(
      Test.createTestingModule({ controllers: [ScopedController] }).compile(),
    ).rejects.toThrow(UnknownDependenciesException);
  });
});
