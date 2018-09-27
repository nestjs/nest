import 'reflect-metadata';
import { ReflectorFactory } from '@nest/core';

describe('Reflector', () => {
  class Nest {}

  let reflector: ReflectorFactory;

  beforeEach(() => {
    reflector = new ReflectorFactory(Nest);
  });

  describe('get', () => {
    it('should get metadata', () => {
      Reflect.defineMetadata('NEST', 'nest', Nest);
      expect(reflector.get('NEST')).toEqual('nest');
    });
  });

  describe('set', () => {
    it('should set metadata', () => {
      reflector.set('NEST', 'nest');
      expect(Reflect.getMetadata('NEST', Nest)).toEqual('nest');
    });
  });

  describe('has', () => {
    it('should have metadata', () => {
      Reflect.defineMetadata('NEST', 'nest', Nest);
      expect(reflector.has('NEST')).toBeTruthy();
    });
  });

  describe('defineByKeys', () => {
    it('should define metadata by keys', () => {
      const ONE = 'ONE';
      const TWO = 'TWO';

      reflector.defineByKeys({
        [ONE]: 'one',
        [TWO]: 'two',
      });

      expect(Reflect.getMetadata(ONE, Nest)).toEqual('one');
      expect(Reflect.getMetadata(TWO, Nest)).toEqual('two');
    });
  });
});
