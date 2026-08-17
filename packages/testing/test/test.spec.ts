import { Test } from '../test.js';
import { TestingModuleBuilder } from '../testing-module.builder.js';

describe('Test', () => {
  describe('createTestingModule', () => {
    it('should return a TestingModuleBuilder instance', () => {
      const builder = Test.createTestingModule({});
      expect(builder).toBeInstanceOf(TestingModuleBuilder);
    });

    it('should accept options and return a TestingModuleBuilder', () => {
      const builder = Test.createTestingModule(
        {},
        { moduleIdGeneratorAlgorithm: 'deep-hash' },
      );
      expect(builder).toBeInstanceOf(TestingModuleBuilder);
    });
  });
});
