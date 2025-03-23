import { expect } from 'chai';
import {
  addLeadingSlash,
  isConstructor,
  isEmptyArray,
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
} from '../../utils/shared.utils';

function Foo(a) {
  this.a = 1;
}

describe('Shared utils', () => {
  describe('isUndefined', () => {
    it('should return true when obj is undefined', () => {
      expect(isUndefined(undefined)).to.be.true;
    });
    it('should return false when object is not undefined', () => {
      expect(isUndefined({})).to.be.false;
    });
    it('should return false for falsy values like false, 0, or empty string', () => {
      expect(isUndefined(false)).to.be.false;
      expect(isUndefined(0)).to.be.false;
      expect(isUndefined('')).to.be.false;
    });
  });

  describe('isFunction', () => {
    it('should return true when obj is function', () => {
      expect(isFunction(() => ({}))).to.be.true;
    });
    it('should return false when object is not function', () => {
      expect(isFunction(null)).to.be.false;
      expect(isFunction(undefined)).to.be.false;
    });
  });

  describe('isObject', () => {
    it('should return true when obj is object', () => {
      expect(isObject({})).to.be.true;
    });
    it('should return true for arrays', () => {
      expect(isObject([1, 2, 3])).to.be.true; // Arrays are objects
    });
    it('should return false when object is not object', () => {
      expect(isObject(3)).to.be.false;
      expect(isObject(null)).to.be.false;
      expect(isObject(undefined)).to.be.false;
    });
  });

  describe('isPlainObject', () => {
    it('should return true when obj is plain object', () => {
      expect(isPlainObject({})).to.be.true;
      expect(isPlainObject({ prop: true })).to.be.true;
      expect(
        isPlainObject({
          constructor: Foo,
        }),
      ).to.be.true;
      expect(isPlainObject(Object.create(null))).to.be.true;
    });
    it('should return false when object is not object', () => {
      expect(isPlainObject(3)).to.be.false;
      expect(isPlainObject(null)).to.be.false;
      expect(isPlainObject(undefined)).to.be.false;
      expect(isPlainObject([1, 2, 3])).to.be.false;
      expect(isPlainObject(new Date())).to.be.false;
      expect(isPlainObject(new Foo(1))).to.be.false;
    });
    it('should return false for objects with custom prototypes', () => {
      function CustomObject() {}
      expect(isPlainObject(new CustomObject())).to.be.false;
    });
  });

  describe('isString', () => {
    it('should return true when val is a string', () => {
      expect(isString('true')).to.be.true;
    });
    it('should return false when val is not a string', () => {
      expect(isString(new String('fine'))).to.be.false;
      expect(isString(false)).to.be.false;
      expect(isString(null)).to.be.false;
      expect(isString(undefined)).to.be.false;
    });
  });

  describe('isSymbol', () => {
    it('should return true when val is a Symbol', () => {
      expect(isSymbol(Symbol())).to.be.true;
    });
    it('should return false when val is not a symbol', () => {
      expect(isSymbol('Symbol()')).to.be.false;
      expect(isSymbol(false)).to.be.false;
      expect(isSymbol(null)).to.be.false;
      expect(isSymbol(undefined)).to.be.false;
    });
    it('should return false for invalid Symbol objects', () => {
      expect(isSymbol(Object(Symbol()))).to.be.false;
    });
  });

  describe('isNumber', () => {
    it('should return true when val is a number or NaN', () => {
      expect(isNumber(1)).to.be.true;
      expect(isNumber(1.23)).to.be.true; // with decimals
      expect(isNumber(123e-5)).to.be.true; // scientific (exponent) notation
      expect(isNumber(0o1)).to.be.true; // octal notation
      expect(isNumber(0b1)).to.be.true; // binary notation
      expect(isNumber(0x1)).to.be.true; // hexadecimal notation
      expect(isNumber(NaN)).to.be.true;
      expect(isNumber(Infinity)).to.be.true;
      expect(isNumber(-Infinity)).to.be.true;
    });
    it('should return false when val is not a number', () => {
      // expect(isNumber(1n)).to.be.false; // big int (available on ES2020)
      expect(isNumber('1')).to.be.false; // string
      expect(isNumber(undefined)).to.be.false; // nullish
      expect(isNumber(null)).to.be.false; // nullish
      expect(isNumber(new Number(123))).to.be.false; // number
    });
  });

  describe('isConstructor', () => {
    it('should return true when string is equal to constructor', () => {
      expect(isConstructor('constructor')).to.be.true;
    });
    it('should return false when string is not equal to constructor', () => {
      expect(isConstructor('nope')).to.be.false;
    });
    it('should return false for non-string values', () => {
      expect(isConstructor(null)).to.be.false;
      expect(isConstructor(undefined)).to.be.false;
      expect(isConstructor(123)).to.be.false;
    });
  });

  describe('addLeadingSlash', () => {
    it('should return the validated path ("add / if not exists")', () => {
      expect(addLeadingSlash('nope')).to.be.eql('/nope');
      expect(addLeadingSlash('{:nope}')).to.be.eql('/{:nope}');
    });
    it('should return the same path', () => {
      expect(addLeadingSlash('/nope')).to.be.eql('/nope');
      expect(addLeadingSlash('{/:nope}')).to.be.eql('{/:nope}');
    });
    it('should return empty path', () => {
      expect(addLeadingSlash('')).to.be.eql('');
      expect(addLeadingSlash(null!)).to.be.eql('');
      expect(addLeadingSlash(undefined)).to.be.eql('');
    });
    it('should handle paths with special characters', () => {
      expect(addLeadingSlash('path-with-special-chars!@#$%^&*()')).to.eql(
        '/path-with-special-chars!@#$%^&*()',
      );
    });
  });

  describe('normalizePath', () => {
    it('should remove all trailing slashes at the end of the path', () => {
      expect(normalizePath('path/')).to.be.eql('/path');
      expect(normalizePath('path///')).to.be.eql('/path');
      expect(normalizePath('/path/path///')).to.be.eql('/path/path');
    });
    it('should replace all slashes with only one slash', () => {
      expect(normalizePath('////path/')).to.be.eql('/path');
      expect(normalizePath('///')).to.be.eql('/');
      expect(normalizePath('/path////path///')).to.be.eql('/path/path');
    });
    it('should return / for empty path', () => {
      expect(normalizePath('')).to.be.eql('/');
      expect(normalizePath(null!)).to.be.eql('/');
      expect(normalizePath(undefined)).to.be.eql('/');
    });
  });

  describe('isNil', () => {
    it('should return true when obj is undefined or null', () => {
      expect(isNil(undefined)).to.be.true;
      expect(isNil(null)).to.be.true;
    });
    it('should return false when object is not undefined and null', () => {
      expect(isNil('3')).to.be.false;
    });
    it('should return false for falsy values like false, 0, or empty string', () => {
      expect(isNil(false)).to.be.false;
      expect(isNil(0)).to.be.false;
      expect(isNil('')).to.be.false;
    });
  });

  describe('isEmptyArray', () => {
    it('should return true when array is empty', () => {
      expect(isEmptyArray([])).to.be.true;
    });

    it('should return false when array is not empty', () => {
      expect(isEmptyArray([1, 2])).to.be.false;
      expect(isEmptyArray(['a', 'b', 'c'])).to.be.false;
      expect(isEmptyArray([{}])).to.be.false;
    });

    it('should return false for non-array values', () => {
      expect(isEmptyArray(null)).to.be.false;
      expect(isEmptyArray(undefined)).to.be.false;
      expect(isEmptyArray({})).to.be.false;
      expect(isEmptyArray('')).to.be.false;
      expect(isEmptyArray(0)).to.be.false;
      expect(isEmptyArray(false)).to.be.false;
      expect(isEmptyArray(Symbol())).to.be.false;
      expect(isEmptyArray(() => {})).to.be.false;
    });

    it('should return false for array-like objects', () => {
      expect(isEmptyArray({ length: 0 })).to.be.false;
      expect(isEmptyArray({ length: 1 })).to.be.false;
    });

    it('should return false for sparse arrays', () => {
      const sparseArray = new Array(3);
      expect(isEmptyArray(sparseArray)).to.be.false;
    });
  });

  describe('stripEndSlash', () => {
    it('should strip end slash if present', () => {
      expect(stripEndSlash('/cats/')).to.equal('/cats');
      expect(stripEndSlash('/cats')).to.equal('/cats');
    });
  });

  describe('stripEndSlash', () => {
    it('should strip end slash if present', () => {
      expect(stripEndSlash('/cats/')).to.equal('/cats');
    });
    it('should return the same path if no trailing slash exists', () => {
      expect(stripEndSlash('/cats')).to.equal('/cats');
    });
  });
});
