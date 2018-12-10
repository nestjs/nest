import { expect } from 'chai';
import { isFunction } from '../../utils/shared.utils';
import {
  validateEach,
  InvalidDecoratorItemException,
} from '../../utils/validate-each.util';

describe('validateEach', () => {
  describe('when any item will not pass predicate', () => {
    it('should throw exception', () => {
      expect(() =>
        validateEach({ name: 'test' } as any, ['test'], isFunction, '', ''),
      ).to.throws(InvalidDecoratorItemException);
    });
  });
  describe('when all items passed predicate', () => {
    it('should return true', () => {
      expect(validateEach({} as any, [() => null], isFunction, '', '')).to.be
        .true;
    });
  });
});
