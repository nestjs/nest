import { isFunction } from '@nestjs/common/utils/shared.utils';
import { Metatype } from '@nestjs/common/interfaces';

export function filterMiddlewares(middlewares) {
  return []
    .concat(middlewares)
    .filter(isFunction)
    .map(middleware => mapToClass(middleware));
};

export function mapToClass(middleware) {
  if (isClass(middleware)) {
    return middleware;
  }
  return assignToken(
    class {
      public resolve = (...args) => (req, res, next) =>
        middleware(req, res, next);
    },
  );
};

export function isClass(middleware) {
  return middleware.toString().substring(0, 5) === 'class';
};

function assignTokenFactory() {
  let id = 1;
  return (metatype): Metatype<any> => {
    Object.defineProperty(metatype, 'name', { value: ++id });
    return metatype;
  }
}

export const assignToken = assignTokenFactory();
