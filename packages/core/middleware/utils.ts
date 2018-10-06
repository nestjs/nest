import { Type } from '@nestjs/common/interfaces';
import { isFunction } from '@nestjs/common/utils/shared.utils';

export const filterMiddleware = middleware => {
  return []
    .concat(middleware)
    .filter(isFunction)
    .map(mapToClass);
};

export const mapToClass = middleware => {
  if (isClass(middleware)) {
    return middleware;
  }
  return assignToken(
    class {
      resolve = (...args) => (...params) => middleware(...params);
    },
  );
};

export function isClass(middleware: any) {
  return middleware.toString().substring(0, 5) === 'class';
}

export function assignToken(this: any, metatype): Type<any> {
  this.id = this.id || 1;
  Object.defineProperty(metatype, 'name', { value: ++this.id });
  return metatype;
}
