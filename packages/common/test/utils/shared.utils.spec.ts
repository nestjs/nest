import {
  addLeadingSlash,
  isConstructor,
  isEmpty,
  isFunction,
  isNil,
  isObject,
  isPlainObject,
  isString,
  isUndefined,
  normalizePath,
  stripEndSlash,
} from '../../utils/shared.utils';

function Foo(a) {
  this.a = 1;
}

describe('Shared utils', () => {
  describe('isUndefined', () => {
    it('should return true when obj is undefined', () => {
      expect(isUndefined(undefined)).toBeTruthy();
    });
    it('should return false when object is not undefined', () => {
      expect(isUndefined({})).toBeFalsy();
    });
  });
  describe('isFunction', () => {
    it('should return true when obj is function', () => {
      expect(isFunction(() => ({}))).toBeTruthy();
    });
    it('should return false when object is not function', () => {
      expect(isFunction(null)).toBeFalsy();
      expect(isFunction(undefined)).toBeFalsy();
    });
  });
  describe('isObject', () => {
    it('should return true when obj is object', () => {
      expect(isObject({})).toBeTruthy();
    });
    it('should return false when object is not object', () => {
      expect(isObject(3)).toBeFalsy();
      expect(isObject(null)).toBeFalsy();
      expect(isObject(undefined)).toBeFalsy();
    });
  });
  describe('isPlainObject', () => {
    it('should return true when obj is plain object', () => {
      expect(isPlainObject({})).toBeTruthy();
      expect(isPlainObject({ prop: true })).toBeTruthy();
      expect(
        isPlainObject({
          constructor: Foo,
        }),
      ).toBeTruthy();
      expect(isPlainObject(Object.create(null))).toBeTruthy();
    });
    it('should return false when object is not object', () => {
      expect(isPlainObject(3)).toBeFalsy();
      expect(isPlainObject(null)).toBeFalsy();
      expect(isPlainObject(undefined)).toBeFalsy();
      expect(isPlainObject([1, 2, 3])).toBeFalsy();
      expect(isPlainObject(new Date())).toBeFalsy();
      expect(isPlainObject(new Foo(1))).toBeFalsy();
    });
  });
  describe('isString', () => {
    it('should return true when obj is a string', () => {
      expect(isString('true')).toBeTruthy();
    });
    it('should return false when object is not a string', () => {
      expect(isString(false)).toBeFalsy();
      expect(isString(null)).toBeFalsy();
      expect(isString(undefined)).toBeFalsy();
    });
  });
  describe('isConstructor', () => {
    it('should return true when string is equal to constructor', () => {
      expect(isConstructor('constructor')).toBeTruthy();
    });
    it('should return false when string is not equal to constructor', () => {
      expect(isConstructor('nope')).toBeFalsy();
    });
  });
  describe('addLeadingSlash', () => {
    it('should return the validated path ("add / if not exists")', () => {
      expect(addLeadingSlash('nope')).toEqual('/nope');
    });
    it('should return the same path', () => {
      expect(addLeadingSlash('/nope')).toEqual('/nope');
    });
    it('should return empty path', () => {
      expect(addLeadingSlash('')).toEqual('');
      expect(addLeadingSlash(null)).toEqual('');
      expect(addLeadingSlash(undefined)).toEqual('');
    });
  });
  describe('normalizePath', () => {
    it('should remove all trailing slashes at the end of the path', () => {
      expect(normalizePath('path/')).toEqual('/path');
      expect(normalizePath('path///')).toEqual('/path');
      expect(normalizePath('/path/path///')).toEqual('/path/path');
    });
    it('should replace all slashes with only one slash', () => {
      expect(normalizePath('////path/')).toEqual('/path');
      expect(normalizePath('///')).toEqual('/');
      expect(normalizePath('/path////path///')).toEqual('/path/path');
    });
    it('should return / for empty path', () => {
      expect(normalizePath('')).toEqual('/');
      expect(normalizePath(null)).toEqual('/');
      expect(normalizePath(undefined)).toEqual('/');
    });
  });
  describe('isNil', () => {
    it('should return true when obj is undefined or null', () => {
      expect(isNil(undefined)).toBeTruthy();
      expect(isNil(null)).toBeTruthy();
    });
    it('should return false when object is not undefined and null', () => {
      expect(isNil('3')).toBeFalsy();
    });
  });
  describe('isEmpty', () => {
    it('should return true when array is empty or not exists', () => {
      expect(isEmpty([])).toBeTruthy();
      expect(isEmpty(null)).toBeTruthy();
      expect(isEmpty(undefined)).toBeTruthy();
    });
    it('should return false when array is not empty', () => {
      expect(isEmpty([1, 2])).toBeFalsy();
    });
  });
  describe('stripEndSlash', () => {
    it('should strip end slash if present', () => {
      expect(stripEndSlash('/cats/')).toEqual('/cats');
      expect(stripEndSlash('/cats')).toEqual('/cats');
    });
  });
});
