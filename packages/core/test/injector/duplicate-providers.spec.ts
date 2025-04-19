/// <reference types="mocha" />
/// <reference types="chai" />
/// <reference types="sinon" />

import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import { Module as ModuleDecorator } from '../../../common/decorators/modules/module.decorator';
import { RuntimeException } from '../../errors/exceptions/runtime.exception';

// Test providers
class TestProvider1 {}
class TestProvider2 {}

describe('Duplicate providers detection', () => {
  describe('when registering the same class provider twice', () => {
    it('should throw a RuntimeException', async () => {
      @ModuleDecorator({
        providers: [TestProvider1, TestProvider1],
      })
      class TestModule {}

      try {
        await Test.createTestingModule({
          imports: [TestModule],
        }).compile();

        // If we reach here, no error was thrown
        expect.fail('Expected error for duplicate providers was not thrown');
      } catch (error) {
        expect(error).to.be.instanceOf(RuntimeException);
        expect(error.message).to.include('Duplicate provider found');
        expect(error.message).to.include('TestProvider1');
      }
    });
  });

  describe('when registering the same token in custom providers', () => {
    it('should throw a RuntimeException', async () => {
      @ModuleDecorator({
        providers: [
          {
            provide: 'TOKEN',
            useValue: 'value1',
          },
          {
            provide: 'TOKEN',
            useValue: 'value2',
          },
        ],
      })
      class TestModule {}

      try {
        await Test.createTestingModule({
          imports: [TestModule],
        }).compile();

        // If we reach here, no error was thrown
        expect.fail('Expected error for duplicate providers was not thrown');
      } catch (error) {
        expect(error).to.be.instanceOf(RuntimeException);
        expect(error.message).to.include('Duplicate provider found');
        expect(error.message).to.include('TOKEN');
      }
    });
  });

  describe('when registering a class provider and custom provider with the same token', () => {
    it('should throw a RuntimeException', async () => {
      @ModuleDecorator({
        providers: [
          TestProvider1,
          {
            provide: TestProvider1,
            useClass: TestProvider2,
          },
        ],
      })
      class TestModule {}

      try {
        await Test.createTestingModule({
          imports: [TestModule],
        }).compile();

        // If we reach here, no error was thrown
        expect.fail('Expected error for duplicate providers was not thrown');
      } catch (error) {
        expect(error).to.be.instanceOf(RuntimeException);
        expect(error.message).to.include('Duplicate provider found');
        expect(error.message).to.include('TestProvider1');
      }
    });
  });
});
