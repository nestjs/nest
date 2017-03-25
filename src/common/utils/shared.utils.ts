export const isUndefined = (obj): boolean => typeof obj === 'undefined';
export const isFunction = (fn): boolean => typeof fn === 'function';
export const isConstructor = (fn): boolean => fn === 'constructor';
export const validatePath = (path): string => (path.charAt(0) !== '/') ? '/' + path : path;
export const isNil = (obj): boolean => isUndefined(obj) || obj === null;