import { expect } from 'chai';
import { Test } from '../test';
import { TestingModuleBuilder } from '../testing-module.builder';

describe('Test', () => {
  describe('createTestingModule', () => {
    it('should return a TestingModuleBuilder instance', () => {
      const builder = Test.createTestingModule({});
      expect(builder).to.be.instanceOf(TestingModuleBuilder);
    });

    it('should accept options and return a TestingModuleBuilder', () => {
      const builder = Test.createTestingModule(
        {},
        { moduleIdGeneratorAlgorithm: 'deep-hash' },
      );
      expect(builder).to.be.instanceOf(TestingModuleBuilder);
    });
  });
});
