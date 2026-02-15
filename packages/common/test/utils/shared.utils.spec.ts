import {
  addLeadingSlash,
  isConstructor,
  isEmpty,
  isFunction,
  isNil,
  isNumber,
  isObject,
  isPlainObject,
  isString,
  isSymbol,
  isUndefined,
  normalizePath,
  stripEndSlash,
} from '../../utils/shared.utils.js';

function Foo(a) {
  this.a = 1;
}

describe('Shared utils', () => {
  describe('isUndefined', () => {
    it('should return true when obj is undefined', () => {
      expect(isUndefined(undefined)).toBe(true);
    });
    it('should return false when object is not undefined', () => {
      expect(isUndefined({})).toBe(false);
    });
  });
  describe('isFunction', () => {
    it('should return true when obj is function', () => {
      expect(isFunction(() => ({}))).toBe(true);
    });
    it('should return false when object is not function', () => {
      expect(isFunction(null)).toBe(false);
      expect(isFunction(undefined)).toBe(false);
    });
  });
  describe('isObject', () => {
    it('should return true when obj is object', () => {
      expect(isObject({})).toBe(true);
    });
    it('should return false when object is not object', () => {
      expect(isObject(3)).toBe(false);
      expect(isObject(null)).toBe(false);
      expect(isObject(undefined)).toBe(false);
    });
  });
  describe('isPlainObject', () => {
    it('should return true when obj is plain object', () => {
      expect(isPlainObject({})).toBe(true);
      expect(isPlainObject({ prop: true })).toBe(true);
      expect(
        isPlainObject({
          constructor: Foo,
        }),
      ).toBe(true);
      expect(isPlainObject(Object.create(null))).toBe(true);
    });
    it('should return false when object is not object', () => {
      expect(isPlainObject(3)).toBe(false);
      expect(isPlainObject(null)).toBe(false);
      expect(isPlainObject(undefined)).toBe(false);
      expect(isPlainObject([1, 2, 3])).toBe(false);
      expect(isPlainObject(new Date())).toBe(false);
      expect(isPlainObject(new Foo(1))).toBe(false);
    });
  });
  describe('isString', () => {
    it('should return true when val is a string', () => {
      expect(isString('true')).toBe(true);
    });
    it('should return false when val is not a string', () => {
      expect(isString(new String('fine'))).toBe(false);
      expect(isString(false)).toBe(false);
      expect(isString(null)).toBe(false);
      expect(isString(undefined)).toBe(false);
    });
  });
  describe('isSymbol', () => {
    it('should return true when val is a Symbol', () => {
      expect(isSymbol(Symbol())).toBe(true);
    });
    it('should return false when val is not a symbol', () => {
      expect(isSymbol('Symbol()')).toBe(false);
      expect(isSymbol(false)).toBe(false);
      expect(isSymbol(null)).toBe(false);
      expect(isSymbol(undefined)).toBe(false);
    });
  });
  describe('isNumber', () => {
    it('should return true when val is a number or NaN', () => {
      expect(isNumber(1)).toBe(true);
      expect(isNumber(1.23)).toBe(true); // with decimals
      expect(isNumber(123e-5)).toBe(true); // scientific (exponent) notation
      expect(isNumber(0o1)).toBe(true); // octal notation
      expect(isNumber(0b1)).toBe(true); // binary notation
      expect(isNumber(0x1)).toBe(true); // hexadecimal notation
      expect(isNumber(NaN)).toBe(true);
    });
    it('should return false when val is not a number', () => {
      // expect(isNumber(1n)).toBe(false); // big int (available on ES2020)
      expect(isNumber('1')).toBe(false); // string
      expect(isNumber(undefined)).toBe(false); // nullish
      expect(isNumber(null)).toBe(false); // nullish
    });
  });
  describe('isConstructor', () => {
    it('should return true when string is equal to constructor', () => {
      expect(isConstructor('constructor')).toBe(true);
    });
    it('should return false when string is not equal to constructor', () => {
      expect(isConstructor('nope')).toBe(false);
    });
  });
  describe('addLeadingSlash', () => {
    it('should return the validated path ("add / if not exists")', () => {
      expect(addLeadingSlash('nope')).toEqual('/nope');
      expect(addLeadingSlash('{:nope}')).toEqual('/{:nope}');
    });
    it('should return the same path', () => {
      expect(addLeadingSlash('/nope')).toEqual('/nope');
      expect(addLeadingSlash('{/:nope}')).toEqual('{/:nope}');
    });
    it('should return empty path', () => {
      expect(addLeadingSlash('')).toEqual('');
      expect(addLeadingSlash(null!)).toEqual('');
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
      expect(normalizePath(null!)).toEqual('/');
      expect(normalizePath(undefined)).toEqual('/');
    });
  });
  describe('isNil', () => {
    it('should return true when obj is undefined or null', () => {
      expect(isNil(undefined)).toBe(true);
      expect(isNil(null)).toBe(true);
    });
    it('should return false when object is not undefined and null', () => {
      expect(isNil('3')).toBe(false);
    });
  });
  describe('isEmpty', () => {
    it('should return true when array is empty or not exists', () => {
      expect(isEmpty([])).toBe(true);
      expect(isEmpty(null)).toBe(true);
      expect(isEmpty(undefined)).toBe(true);
    });
    it('should return false when array is not empty', () => {
      expect(isEmpty([1, 2])).toBe(false);
    });
  });
  describe('stripEndSlash', () => {
    it('should strip end slash if present', () => {
      expect(stripEndSlash('/cats/')).toBe('/cats');
      expect(stripEndSlash('/cats')).toBe('/cats');
    });
  });
});
