import { expect } from 'chai';
import { isFunction } from '@nestjs/common/utils/shared.utils';
import {
  validateEach,
  InvalidDecoratorItemException,
} from '@nestjs/common/utils/validate-each.util';

describe('validateEach', () => {
  describe('when any item will not pass predicate', () => {
    it('should throw exception', () => {
      try {
        validateEach({} as any, ['test'], isFunction, '', '');
      } catch (e) {
        expect(e).to.be.instanceof(InvalidDecoratorItemException);
      }
    });
  });
  describe('when all items passed predicate', () => {
    it('should return true', () => {
      expect(validateEach({} as any, [() => null], isFunction, '', '')).to.be
        .true;
    });
  });
});
