import { Type } from '@nestjs/common/interfaces';
import { isFunction } from '@nestjs/common/utils/shared.utils';
import * as uuid from 'uuid/v4';

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

export function assignToken(metatype): Type<any> {
  Object.defineProperty(metatype, 'name', { value: uuid() });
  return metatype;
}
