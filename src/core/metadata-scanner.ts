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
    return iterate(this.getAllFilteredMethodNames_(prototype))
      .map(callback)
      .filter(metadata => !isNil(metadata))
      .toArray();
  }

  private getAllFilteredMethodNames_(prototype): string[] {
    let methods: string[] = [];
    do {
      iterate(Object.getOwnPropertyNames(prototype))
      .filter(prop => {
        const descriptor = Object.getOwnPropertyDescriptor(prototype, prop);
        if (descriptor.set || descriptor.get) {
          return false;
        }
        return !isConstructor(prop) && isFunction(prototype[prop]);
      })
      .forEach(method => {
        methods.push(method);
      });
    } while ((prototype = Reflect.getPrototypeOf(prototype)) && prototype != Object.prototype)
    return methods;
  }
}
