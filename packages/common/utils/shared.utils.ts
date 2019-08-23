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

  const Ctor = Object.prototype.hasOwnProperty.call(proto, 'constructor') && proto.constructor;

  return typeof Ctor === 'function' && Ctor instanceof Ctor && Function.prototype.toString.call(Ctor) === Function.prototype.toString.call(Object);
};
export const validatePath = (path?: string): string =>
  path ? (path.charAt(0) !== '/' ? '/' + path : path) : '';
export const isFunction = (fn: any): boolean => typeof fn === 'function';
export const isString = (fn: any): fn is string => typeof fn === 'string';
export const isConstructor = (fn: any): boolean => fn === 'constructor';
export const isNil = (obj: any): obj is null | undefined =>
  isUndefined(obj) || obj === null;
export const isEmpty = (array: any): boolean => !(array && array.length > 0);
export const isSymbol = (fn: any): fn is symbol => typeof fn === 'symbol';
