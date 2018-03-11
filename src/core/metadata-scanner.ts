import iterate from 'iterare';
import { Injectable } from '@nestjs/common/interfaces/injectable.interface';
import {
  isConstructor,
  isFunction,
  isNil,
} from '@nestjs/common/utils/shared.utils';

export class MetadataScanner {
  public scanFromPrototype<T extends Injectable, R>(
    instance: T,
    prototype,
    callback: (name: string) => R,
  ): R[] {
    return iterate([...this.getAllFilteredMethodNames(prototype)])
      .map(callback)
      .filter(metadata => !isNil(metadata))
      .toArray();
  }

  *getAllFilteredMethodNames(prototype): IterableIterator<string> {
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
      (prototype = Reflect.getPrototypeOf(prototype)) &&
      prototype != Object.prototype
    );
  }
}
