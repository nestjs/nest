import { forwardRef, Inject, Injectable, Scope } from '@nestjs/common';
import { ContextIdFactory } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { CircularDependencyException } from '../../errors/exceptions/circular-dependency.exception.js';

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () =>
        reject(new Error('Provider resolution did not settle within 2000ms')),
      2000,
    );
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function createFixture(bothSides: boolean) {
  @Injectable({ scope: Scope.REQUEST })
  class UpdateUsecase {
    constructor(
      @Inject(forwardRef(() => CreateUsecase))
      public readonly create: { update: UpdateUsecase },
    ) {}
  }

  @Injectable({ scope: Scope.REQUEST })
  class CreateUsecase {
    constructor(
      @Inject(bothSides ? forwardRef(() => UpdateUsecase) : UpdateUsecase)
      public readonly update: UpdateUsecase,
    ) {}
  }

  const moduleRef = await Test.createTestingModule({
    providers: [UpdateUsecase, CreateUsecase],
  }).compile();

  return { moduleRef, CreateUsecase, UpdateUsecase };
}

describe.each(['create-first', 'update-first'] as const)(
  'Request-scoped circular dependencies (%s)',
  order => {
    it('rejects the unsupported one-sided cycle without hanging', async () => {
      const { moduleRef, CreateUsecase, UpdateUsecase } =
        await createFixture(false);

      try {
        if (order === 'update-first') {
          const first = await withTimeout(
            moduleRef.resolve<UpdateUsecase>(
              UpdateUsecase,
              ContextIdFactory.create(),
            ),
          );
          expect(first).toBeInstanceOf(UpdateUsecase);
        }

        await expect(
          withTimeout(
            moduleRef.resolve<CreateUsecase>(
              CreateUsecase,
              ContextIdFactory.create(),
            ),
          ),
        ).rejects.toBeInstanceOf(CircularDependencyException);
      } finally {
        await moduleRef.close();
      }
    });

    it('constructs both providers with two-sided forward references', async () => {
      const { moduleRef, CreateUsecase, UpdateUsecase } =
        await createFixture(true);

      try {
        const types =
          order === 'create-first'
            ? [CreateUsecase, UpdateUsecase]
            : [UpdateUsecase, CreateUsecase];

        for (const type of types) {
          const contextId = ContextIdFactory.create();
          const instance = await withTimeout(
            moduleRef.resolve<object>(type, contextId),
          );

          if (instance instanceof CreateUsecase) {
            expect(instance.update).toBeInstanceOf(UpdateUsecase);
            expect(instance.update.create).toBe(instance);
          } else {
            expect(instance).toBeInstanceOf(UpdateUsecase);
            const update = instance as UpdateUsecase;
            expect(update.create).toBeInstanceOf(CreateUsecase);
            expect(update.create.update).toBe(update);
          }
        }
      } finally {
        await moduleRef.close();
      }
    });
  },
);
