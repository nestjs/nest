import { assignToObject } from '../../repl/assign-to-object.util.js';

describe('assignToObject', () => {
  it('should copy all enumerable properties and their descriptors', () => {
    const sourceObj = {};
    Object.defineProperty(sourceObj, 'foo', {
      value: 123,
      configurable: true,
      enumerable: true,
      writable: true,
    });
    Object.defineProperty(sourceObj, 'bar', {
      value: 456,
      configurable: true,
      enumerable: true,
      writable: false,
    });
    const targetObj = {};

    assignToObject(targetObj, sourceObj);

    expect(Object.getOwnPropertyDescriptor(targetObj, 'foo')).toEqual({
      value: 123,
      configurable: true,
      enumerable: true,
      writable: true,
    });
    expect(Object.getOwnPropertyDescriptor(targetObj, 'bar')).toEqual({
      value: 456,
      configurable: true,
      enumerable: true,
      writable: false,
    });
  });
});
