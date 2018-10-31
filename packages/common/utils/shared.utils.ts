export const isUndefined = (obj): obj is undefined =>
  typeof obj === 'undefined';
export const isFunction = (fn): boolean => typeof fn === 'function';
export const isObject = (fn): fn is object => typeof fn === 'object';
export const isString = (fn): fn is string => typeof fn === 'string';
export const isConstructor = (fn): boolean => fn === 'constructor';
export const validatePath = (path): string =>
  path.charAt(0) !== '/' ? '/' + path : path;
export const isNil = (obj): boolean => isUndefined(obj) || obj === null;
export const isEmpty = (array): boolean => !(array && array.length > 0);
export const isSymbol = (fn): fn is symbol => typeof fn === 'symbol';
