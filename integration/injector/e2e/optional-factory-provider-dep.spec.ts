import { Scope } from '@nestjs/common';
import { UnknownDependenciesException } from '@nestjs/core/errors/exceptions/unknown-dependencies.exception';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';

describe('Optional factory provider deps', () => {
  describe('when dependency is optional', () => {
    describe('and it is available', () => {
      it('then it should be injected into the factory function', async () => {
        const defaultValue = 'DEFAULT_VALUE';
        const moduleRef = await Test.createTestingModule({
          providers: [
            {
              provide: 'FACTORY',
              useFactory: dep => dep ?? defaultValue,
              inject: [{ token: 'MISSING_DEP', optional: true }],
            },
            { provide: 'MISSING_DEP', useValue: 'OPTIONAL_DEP_VALUE' },
          ],
        }).compile();

        const factoryProvider = moduleRef.get('FACTORY');
        expect(factoryProvider).to.equal('OPTIONAL_DEP_VALUE');
      });
    });
    describe('otherwise', () => {
      it('"undefined" should be injected into the factory function', async () => {
        const defaultValue = 'DEFAULT_VALUE';
        const moduleRef = await Test.createTestingModule({
          providers: [
            {
              provide: 'FACTORY',
              useFactory: dep => dep ?? defaultValue,
              inject: [{ token: 'MISSING_DEP', optional: true }],
            },
          ],
        }).compile();

        const factoryProvider = moduleRef.get('FACTORY');
        expect(factoryProvider).to.equal(defaultValue);
      });
      it('"undefined" should be injected into the factory function (scoped provider)', async () => {
        const MY_PROVIDER = 'MY_PROVIDER';
        const FIRST_OPTIONAL_DEPENDENCY = 'FIRST_OPTIONAL_DEPENDENCY';
        const SECOND_OPTIONAL_DEPENDENCY = 'SECOND_OPTIONAL_DEPENDENCY';

        const module = await Test.createTestingModule({
          providers: [
            {
              provide: SECOND_OPTIONAL_DEPENDENCY,
              useValue: 'second',
            },
            {
              provide: MY_PROVIDER,
              scope: Scope.REQUEST,
              inject: [
                {
                  token: FIRST_OPTIONAL_DEPENDENCY,
                  optional: true,
                },
                {
                  token: SECOND_OPTIONAL_DEPENDENCY,
                  optional: true,
                },
              ],
              useFactory: (first?: string, second?: string) => {
                return { first, second };
              },
            },
          ],
        }).compile();

        expect(await module.resolve(MY_PROVIDER)).to.deep.equal({
          first: undefined,
          second: 'second',
        });
      });
    });
  });
  describe('otherwise', () => {
    describe('and dependency is not registered', () => {
      it('should error out', async () => {
        try {
          const builder = Test.createTestingModule({
            providers: [
              {
                provide: 'FACTORY',
                useFactory: () => 'RETURNED_VALUE',
                inject: ['MISSING_DEP'],
              },
            ],
          });
          await builder.compile();
        } catch (err) {
          expect(err).to.be.instanceOf(UnknownDependenciesException);
        }
      });
    });
  });
  describe('and dependency is registered but it cannot be instantiated', () => {
    it('should error out', async () => {
      try {
        const builder = Test.createTestingModule({
          providers: [
            {
              provide: 'POSSIBLY_MISSING_DEP',
              useFactory: () => null,
              inject: ['MISSING_DEP'],
            },
            {
              provide: 'FACTORY',
              useFactory: () => 'RETURNED_VALUE',
              inject: [{ token: 'POSSIBLY_MISSING_DEP', optional: false }],
            },
          ],
        });
        await builder.compile();
      } catch (err) {
        expect(err).to.be.instanceOf(UnknownDependenciesException);
        expect(err.message).to
          .equal(`Nest can't resolve dependencies of the POSSIBLY_MISSING_DEP (?). Please make sure that the argument MISSING_DEP at index [0] is available in the RootTestModule context.

Potential solutions:
- Is RootTestModule a valid NestJS module?
- If MISSING_DEP is a provider, is it part of the current RootTestModule?
- If MISSING_DEP is exported from a separate @Module, is that module imported within RootTestModule?
  @Module({
    imports: [ /* the Module containing MISSING_DEP */ ]
  })
`);
      }
    });
  });
});
