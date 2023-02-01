import { Injectable } from '@nestjs/common/interfaces/injectable.interface';
import {
  isConstructor,
  isFunction,
  isNil,
} from '@nestjs/common/utils/shared.utils';

export class MetadataScanner {
  public scanFromPrototype<T extends Injectable, R = any>(
    instance: T,
    prototype: object | null,
    callback: (name: string) => R,
  ): R[] {
    if (!prototype) return [];

    const visitedNames = new Map<string, boolean>();
    const result: R[] = [];

    do {
      for (const property of Object.getOwnPropertyNames(prototype)) {
        if (visitedNames.has(property)) continue;

        visitedNames.set(property, true);

        const descriptor = Object.getOwnPropertyDescriptor(prototype, property);

        if (
          descriptor.set ||
          descriptor.get ||
          isConstructor(property) ||
          !isFunction(prototype[property])
        ) {
          continue;
        }

        const value = callback(property);

        if (isNil(value)) {
          continue;
        }

        result.push(value);
      }
    } while (
      (prototype = Reflect.getPrototypeOf(prototype)) &&
      prototype !== Object.prototype
    );

    return result;
  }

  *getAllFilteredMethodNames(
    prototype: object | null,
  ): IterableIterator<string> {
    if (!prototype) return [];

    const visitedNames = new Map<string, boolean>();
    const result: string[] = [];

    do {
      for (const property of Object.getOwnPropertyNames(prototype)) {
        if (visitedNames.has(property)) continue;

        visitedNames.set(property, true);

        const descriptor = Object.getOwnPropertyDescriptor(prototype, property);

        if (
          descriptor.set ||
          descriptor.get ||
          isConstructor(property) ||
          !isFunction(prototype[property])
        ) {
          continue;
        }

        result.push(property);
      }
    } while (
      (prototype = Reflect.getPrototypeOf(prototype)) &&
      prototype !== Object.prototype
    );

    return result.values();
  }
}
