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
    });
  });
  describe('otherwise', () => {
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
