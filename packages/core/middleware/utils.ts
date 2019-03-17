import { Type } from '@nestjs/common/interfaces';
import { isFunction } from '@nestjs/common/utils/shared.utils';
import * as uuid from 'uuid/v4';

export const filterMiddleware = <T>(middleware: T[]) => {
  return []
    .concat(middleware)
    .filter(isFunction)
    .map(mapToClass);
};

export const mapToClass = <T extends Function | Type<any>>(middleware: T) => {
  if (isClass(middleware)) {
    return middleware;
  }
  return assignToken(
    class {
      use = (...params: any[]) => (middleware as Function)(...params);
    },
  );
};

export function isClass(middleware: any) {
  return middleware.toString().substring(0, 5) === 'class';
}

export function assignToken(metatype: Type<any>): Type<any> {
  Object.defineProperty(metatype, 'name', { value: uuid() });
  return metatype;
}
