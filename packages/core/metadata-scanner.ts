import { Injectable } from '@nestjs/common/interfaces/injectable.interface';
import {
  isConstructor,
  isFunction,
  isNil,
} from '@nestjs/common/utils/shared.utils';
import iterate from 'iterare';

export class MetadataScanner {
  public scanFromPrototype<T extends Injectable, R = any>(
    instance: T,
    prototype: any,
    callback: (name: string) => R,
  ): R[] {
    return iterate([...this.getAllFilteredMethodNames(prototype)])
      .map(callback)
      .filter(metadata => !isNil(metadata))
      .toArray();
  }

  *getAllFilteredMethodNames(prototype: any): IterableIterator<string> {
    do {
      yield* iterate(Object.getOwnPropertyNames(prototype))
        .filter(prop => {
          const descriptor = Object.getOwnPropertyDescriptor(prototype, prop);
          if (descriptor.set || descriptor.get) {
            return false;
          }
          return !isConstructor(prop) && isFunction(prototype[prop]);
        })
        .toArray();
    } while (
      // tslint:disable-next-line:no-conditional-assignment
      (prototype = Reflect.getPrototypeOf(prototype)) &&
      prototype !== Object.prototype
    );
  }
}
