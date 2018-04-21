import { isFunction } from '@nestjs/common/utils/shared.utils';
import { Type } from '@nestjs/common/interfaces';

export const filterMiddlewares = middlewares => {
  return []
    .concat(middlewares)
    .filter(isFunction)
    .map(middleware => mapToClass(middleware));
};

export const mapToClass = middleware => {
  if (this.isClass(middleware)) {
    return middleware;
  }
  return assignToken(
    class {
      resolve = (...args) => (...params) => middleware(...params);
    },
  );
};

export const isClass = middleware => {
  return middleware.toString().substring(0, 5) === 'class';
};

export const assignToken = (metatype): Type<any> => {
  this.id = this.id || 1;
  Object.defineProperty(metatype, 'name', { value: ++this.id });
  return metatype;
};
