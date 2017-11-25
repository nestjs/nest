import {expect} from 'chai';

import {
  isConstructor,
  isEmpty,
  isFunction,
  isNil,
  isObject,
  isString,
  isUndefined,
  validatePath
} from '../../utils/shared.utils';

describe('Shared utils', () => {
  describe('isUndefined', () => {
    it('should returns true when obj is undefined',
       () => { expect(isUndefined(undefined)).to.be.true; });
    it('should returns false when object is not undefined',
       () => { expect(isUndefined({})).to.be.false; });
  });
  describe('isFunction', () => {
    it('should returns true when obj is function',
       () => { expect(isFunction(() => ({}))).to.be.true; });
    it('should returns false when object is not function',
       () => { expect(isFunction(null)).to.be.false; });
  });
  describe('isObject', () => {
    it('should returns true when obj is object',
       () => { expect(isObject({})).to.be.true; });
    it('should returns false when object is not object',
       () => { expect(isObject(3)).to.be.false; });
  });
  describe('isString', () => {
    it('should returns true when obj is string',
       () => { expect(isString('true')).to.be.true; });
    it('should returns false when object is not string',
       () => { expect(isString(false)).to.be.false; });
  });
  describe('isConstructor', () => {
    it('should returns true when string is equal constructor',
       () => { expect(isConstructor('constructor')).to.be.true; });
    it('should returns false when string is not equal constructor',
       () => { expect(isConstructor('nope')).to.be.false; });
  });
  describe('validatePath', () => {
    it('should returns validated path ("add / if not exists")',
       () => { expect(validatePath('nope')).to.be.eql('/nope'); });
    it('should returns same path',
       () => { expect(validatePath('/nope')).to.be.eql('/nope'); });
  });
  describe('isNil', () => {
    it('should returns true when obj is undefined or null', () => {
      expect(isNil(undefined)).to.be.true;
      expect(isNil(null)).to.be.true;
    });
    it('should returns false when object is not undefined and null',
       () => { expect(isNil('3')).to.be.false; });
  });
  describe('isEmpty', () => {
    it('should returns true when array is empty or not exists', () => {
      expect(isEmpty([])).to.be.true;
      expect(isEmpty(null)).to.be.true;
    });
    it('should returns false when array is not empty', () => {
      expect(isEmpty([ 1, 2 ])).to.be.false;
    });
  });
});