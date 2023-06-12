import { Injectable } from '@nestjs/common/interfaces/injectable.interface';
import {
  isConstructor,
  isFunction,
  isNil,
} from '@nestjs/common/utils/shared.utils';

export class MetadataScanner {
  private readonly cachedScannedPrototypes: Map<object, string[]> = new Map();

  /**
   * @deprecated
   * @see {@link getAllMethodNames}
   * @see getAllMethodNames
   */
  public scanFromPrototype<T extends Injectable, R = any>(
    instance: T,
    prototype: object,
    callback: (name: string) => R,
  ): R[] {
    if (!prototype) {
      return [];
    }

    const visitedNames = new Map<string, boolean>();
    const result: R[] = [];

    do {
      for (const property of Object.getOwnPropertyNames(prototype)) {
        if (visitedNames.has(property)) {
          continue;
        }

        visitedNames.set(property, true);

        // reason: https://github.com/nestjs/nest/pull/10821#issuecomment-1411916533
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

  /**
   * @deprecated
   * @see {@link getAllMethodNames}
   * @see getAllMethodNames
   */
  public *getAllFilteredMethodNames(
    prototype: object,
  ): IterableIterator<string> {
    yield* this.getAllMethodNames(prototype);
  }

  public getAllMethodNames(prototype: object | null): string[] {
    if (!prototype) {
      return [];
    }

    if (this.cachedScannedPrototypes.has(prototype)) {
      return this.cachedScannedPrototypes.get(prototype);
    }

    const visitedNames = new Map<string, boolean>();
    const result: string[] = [];

    this.cachedScannedPrototypes.set(prototype, result);

    do {
      for (const property of Object.getOwnPropertyNames(prototype)) {
        if (visitedNames.has(property)) {
          continue;
        }

        visitedNames.set(property, true);

        // reason: https://github.com/nestjs/nest/pull/10821#issuecomment-1411916533
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

    return result;
  }
}
