/* eslint-disable @typescript-eslint/no-use-before-define */
export const isUndefined = (obj: any): obj is undefined =>
  typeof obj === 'undefined';

export const isObject = (fn: any): fn is object =>
  !isNil(fn) && typeof fn === 'object';

export const isPlainObject = (fn: any): fn is object => {
  if (!isObject(fn)) {
    return false;
  }
  const proto = Object.getPrototypeOf(fn);
  if (proto === null) {
    return true;
  }
  const ctor =
    Object.prototype.hasOwnProperty.call(proto, 'constructor') &&
    proto.constructor;
  return (
    typeof ctor === 'function' &&
    ctor instanceof ctor &&
    Function.prototype.toString.call(ctor) ===
      Function.prototype.toString.call(Object)
  );
};

export const addLeadingSlash = (path?: string): string =>
  path ? (path.charAt(0) !== '/' ? '/' + path : path) : '';

/**
 * Deprecated. Use the "addLeadingSlash" function instead.
 * @deprecated
 */
export const validatePath = addLeadingSlash;

export const normalizePath = (path?: string): string =>
  path
    ? path.startsWith('/')
      ? ('/' + path.replace(/\/+$/, '')).replace(/\/+/g, '/')
      : '/' + path.replace(/\/+$/, '')
    : '/';

export const isFunction = (fn: any): boolean => typeof fn === 'function';
export const isString = (fn: any): fn is string => typeof fn === 'string';
export const isConstructor = (fn: any): boolean => fn === 'constructor';
export const isNil = (obj: any): obj is null | undefined =>
  isUndefined(obj) || obj === null;
export const isEmpty = (array: any): boolean => !(array && array.length > 0);
export const isSymbol = (fn: any): fn is symbol => typeof fn === 'symbol';
