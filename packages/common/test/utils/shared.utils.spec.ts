import { expect } from 'chai';
import {
  isUndefined,
  isFunction,
  isObject,
  isString,
  isConstructor,
  addLeadingSlash,
  isNil,
  isEmpty,
  isPlainObject,
} from '../../utils/shared.utils';

function Foo(a) {
  this.a = 1;
}

describe('Shared utils', () => {
  describe('isUndefined', () => {
    it('should returns true when obj is undefined', () => {
      expect(isUndefined(undefined)).to.be.true;
    });
    it('should returns false when object is not undefined', () => {
      expect(isUndefined({})).to.be.false;
    });
  });
  describe('isFunction', () => {
    it('should returns true when obj is function', () => {
      expect(isFunction(() => ({}))).to.be.true;
    });
    it('should returns false when object is not function', () => {
      expect(isFunction(null)).to.be.false;
      expect(isFunction(undefined)).to.be.false;
    });
  });
  describe('isObject', () => {
    it('should returns true when obj is object', () => {
      expect(isObject({})).to.be.true;
    });
    it('should returns false when object is not object', () => {
      expect(isObject(3)).to.be.false;
      expect(isObject(null)).to.be.false;
      expect(isObject(undefined)).to.be.false;
    });
  });
  describe('isPlainObject', () => {
    it('should returns true when obj is plain object', () => {
      expect(isPlainObject({})).to.be.true;
      expect(isPlainObject({ prop: true })).to.be.true;
      expect(
        isPlainObject({
          constructor: Foo,
        }),
      ).to.be.true;
      expect(isPlainObject(Object.create(null))).to.be.true;
    });
    it('should returns false when object is not object', () => {
      expect(isPlainObject(3)).to.be.false;
      expect(isPlainObject(null)).to.be.false;
      expect(isPlainObject(undefined)).to.be.false;
      expect(isPlainObject([1, 2, 3])).to.be.false;
      expect(isPlainObject(new Date())).to.be.false;
      expect(isPlainObject(new Foo(1))).to.be.false;
    });
  });
  describe('isString', () => {
    it('should returns true when obj is string', () => {
      expect(isString('true')).to.be.true;
    });
    it('should returns false when object is not string', () => {
      expect(isString(false)).to.be.false;
      expect(isString(null)).to.be.false;
      expect(isString(undefined)).to.be.false;
    });
  });
  describe('isConstructor', () => {
    it('should returns true when string is equal constructor', () => {
      expect(isConstructor('constructor')).to.be.true;
    });
    it('should returns false when string is not equal constructor', () => {
      expect(isConstructor('nope')).to.be.false;
    });
  });
  describe('addLeadingSlash', () => {
    it('should returns validated path ("add / if not exists")', () => {
      expect(addLeadingSlash('nope')).to.be.eql('/nope');
    });
    it('should returns same path', () => {
      expect(addLeadingSlash('/nope')).to.be.eql('/nope');
    });
    it('should returns empty path', () => {
      expect(addLeadingSlash('')).to.be.eql('');
      expect(addLeadingSlash(null)).to.be.eql('');
      expect(addLeadingSlash(undefined)).to.be.eql('');
    });
  });
  describe('isNil', () => {
    it('should returns true when obj is undefined or null', () => {
      expect(isNil(undefined)).to.be.true;
      expect(isNil(null)).to.be.true;
    });
    it('should returns false when object is not undefined and null', () => {
      expect(isNil('3')).to.be.false;
    });
  });
  describe('isEmpty', () => {
    it('should returns true when array is empty or not exists', () => {
      expect(isEmpty([])).to.be.true;
      expect(isEmpty(null)).to.be.true;
      expect(isEmpty(undefined)).to.be.true;
    });
    it('should returns false when array is not empty', () => {
      expect(isEmpty([1, 2])).to.be.false;
    });
  });
});
