import { ClassProvider, FactoryProvider, ValueProvider } from '@nestjs/common';
import {
  isClassProvider,
  isFactoryProvider,
  isValueProvider,
} from '../../../injector/helpers/provider-classifier.js';

describe('provider classifier', () => {
  describe('isClassProvider', () => {
    it('should return true if useClass is present', () => {
      const classProvider: ClassProvider = {
        useClass: class TestClass {},
        provide: 'token',
      };

      expect(isClassProvider(classProvider)).toBe(true);
    });

    it('should return false if useClass is undefined', () => {
      const classProvider: ClassProvider = {
        useClass: undefined!,
        provide: 'token',
      };

      expect(isClassProvider(classProvider)).toBe(false);
    });

    it('should return false if useClass is not present', () => {
      const classProvider = {
        provide: 'token',
      };

      expect(isClassProvider(classProvider as ClassProvider)).toBe(false);
    });

    it('should return false if provider is undefined', () => {
      const classProvider = undefined!;

      expect(isClassProvider(classProvider)).toBe(false);
    });
  });

  describe('isValueProvider', () => {
    it('should return true if useValue is not undefined', () => {
      const valueProvider: ValueProvider = {
        useValue: 'value',
        provide: 'token',
      };

      expect(isValueProvider(valueProvider)).toBe(true);
    });

    it('should return true if useValue is "false"', () => {
      const valueProvider: ValueProvider = {
        useValue: false,
        provide: 'token',
      };

      expect(isValueProvider(valueProvider)).toBe(true);
    });

    it('should return true if useValue is "null"', () => {
      const valueProvider: ValueProvider = {
        useValue: null,
        provide: 'token',
      };

      expect(isValueProvider(valueProvider)).toBe(true);
    });

    it('should return true if useValue is an empty string', () => {
      const valueProvider: ValueProvider = {
        useValue: null,
        provide: '',
      };

      expect(isValueProvider(valueProvider)).toBe(true);
    });

    it('should return false if useValue is undefined', () => {
      const valueProvider: ValueProvider = {
        useValue: undefined,
        provide: 'token',
      };

      expect(isValueProvider(valueProvider)).toBe(false);
    });

    it('should return false if useValue is not present', () => {
      const valueProvider = {
        provide: 'token',
      };

      expect(isValueProvider(valueProvider as ValueProvider)).toBe(false);
    });

    it('should return false if provider is undefined', () => {
      const valueProvider = undefined!;

      expect(isValueProvider(valueProvider as ValueProvider)).toBe(false);
    });
  });

  describe('isFactoryProvider', () => {
    it('should return true if useFactory is present', () => {
      const factoryProvider: FactoryProvider = {
        provide: 'token',
        useFactory: () => {},
      };

      expect(isFactoryProvider(factoryProvider)).toBe(true);
    });

    it('should return false if useFactory is not present', () => {
      const factoryProvider = {
        provide: 'token',
      };

      expect(isFactoryProvider(factoryProvider as FactoryProvider)).toBe(false);
    });

    it('should return false if useFactory is undefined', () => {
      const factoryProvider: FactoryProvider = {
        provide: 'token',
        useFactory: undefined!,
      };

      expect(isFactoryProvider(factoryProvider)).toBe(false);
    });
  });
});
