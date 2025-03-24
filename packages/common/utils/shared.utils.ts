export const isUndefined = (obj: unknown): obj is undefined =>
  typeof obj === 'undefined';

export const isObject = (fn: unknown): fn is object =>
  !isNil(fn) && typeof fn === 'object';

export const isPlainObject = (fn: unknown): fn is object => {
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
  path && typeof path === 'string'
    ? path.charAt(0) !== '/' && path.substring(0, 2) !== '{/'
      ? '/' + path
      : path
    : '';

export const normalizePath = (path?: string): string =>
  path
    ? path.startsWith('/')
      ? ('/' + path.replace(/\/+$/, '')).replace(/\/+/g, '/')
      : '/' + path.replace(/\/+$/, '')
    : '/';

export const stripEndSlash = (path: string): string =>
  path.endsWith('/') ? path.slice(0, -1) : path;

export const isFunction = (val: unknown): val is Function =>
  typeof val === 'function';

export const isString = (val: unknown): val is string =>
  typeof val === 'string';

export const isNumber = (val: unknown): val is number =>
  typeof val === 'number';

export const isConstructor = (val: unknown): boolean => val === 'constructor';

export const isNil = (val: unknown): val is null | undefined =>
  isUndefined(val) || val === null;

export const isEmpty = (value: unknown): boolean => {
  if (isNil(value)) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  return false;
};

export const isEmptyArray = (array: unknown): boolean => {
  if (isNil(array)) {
    return true;
  }
  return Array.isArray(array) && array.length === 0;
};

export const isSymbol = (val: unknown): val is symbol =>
  typeof val === 'symbol';
