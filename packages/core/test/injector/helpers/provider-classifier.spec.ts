import { ClassProvider, FactoryProvider, ValueProvider } from '@nestjs/common';
import { expect } from 'chai';
import {
  isClassProvider,
  isFactoryProvider,
  isValueProvider,
} from '../../../injector/helpers/provider-classifier';

describe('provider classifier', () => {
  describe('isClassProvider', () => {
    it('should return true if useClass is present', () => {
      const classProvider: ClassProvider = {
        useClass: class TestClass {},
        provide: 'token',
      };

      expect(isClassProvider(classProvider)).to.be.true;
    });

    it('should return false if useClass is undefined', () => {
      const classProvider: ClassProvider = {
        useClass: undefined,
        provide: 'token',
      };

      expect(isClassProvider(classProvider)).to.be.false;
    });

    it('should return false if useClass is not present', () => {
      const classProvider = {
        provide: 'token',
      };

      expect(isClassProvider(classProvider as ClassProvider)).to.be.false;
    });

    it('should return false if provider is undefined', () => {
      const classProvider = undefined;

      expect(isClassProvider(classProvider as ClassProvider)).to.be.false;
    });
  });

  describe('isValueProvider', () => {
    it('should return true if useValue is not undefined', () => {
      const valueProvider: ValueProvider = {
        useValue: 'value',
        provide: 'token',
      };

      expect(isValueProvider(valueProvider)).to.be.true;
    });

    it('should return true if useValue is "false"', () => {
      const valueProvider: ValueProvider = {
        useValue: false,
        provide: 'token',
      };

      expect(isValueProvider(valueProvider)).to.be.true;
    });

    it('should return true if useValue is "null"', () => {
      const valueProvider: ValueProvider = {
        useValue: null,
        provide: 'token',
      };

      expect(isValueProvider(valueProvider)).to.be.true;
    });

    it('should return true if useValue is an empty string', () => {
      const valueProvider: ValueProvider = {
        useValue: null,
        provide: '',
      };

      expect(isValueProvider(valueProvider)).to.be.true;
    });

    it('should return false if useValue is undefined', () => {
      const valueProvider: ValueProvider = {
        useValue: undefined,
        provide: 'token',
      };

      expect(isValueProvider(valueProvider)).to.be.false;
    });

    it('should return false if useValue is not present', () => {
      const valueProvider = {
        provide: 'token',
      };

      expect(isValueProvider(valueProvider as ValueProvider)).to.be.false;
    });

    it('should return false if provider is undefined', () => {
      const valueProvider = undefined;

      expect(isValueProvider(valueProvider as ValueProvider)).to.be.false;
    });
  });

  describe('isFactoryProvider', () => {
    it('should return true if useFactory is present', () => {
      const factoryProvider: FactoryProvider = {
        provide: 'token',
        useFactory: () => {},
      };

      expect(isFactoryProvider(factoryProvider)).to.be.true;
    });

    it('should return false if useFactory is not present', () => {
      const factoryProvider = {
        provide: 'token',
      };

      expect(isFactoryProvider(factoryProvider as FactoryProvider)).to.be.false;
    });

    it('should return false if useFactory is undefined', () => {
      const factoryProvider: FactoryProvider = {
        provide: 'token',
        useFactory: undefined,
      };

      expect(isFactoryProvider(factoryProvider as FactoryProvider)).to.be.false;
    });
  });
});
