import iterate from 'iterare';
import { Injectable } from '@nestjs/common/interfaces/injectable.interface';
import { isConstructor, isFunction, isNil } from '@nestjs/common/utils/shared.utils';

export class MetadataScanner {
    public scanFromPrototype<T extends Injectable, R>(instance: T, prototype, callback: (name: string) => R): R[] {
        return iterate(Object.getOwnPropertyNames(prototype))
            .filter((method) => {
                const descriptor = Object.getOwnPropertyDescriptor(prototype, method);
                if (descriptor.set || descriptor.get) {
                    return false;
                }
                return !isConstructor(method) && isFunction(prototype[method]);
            })
            .map(callback)
            .filter((metadata) => !isNil(metadata))
            .toArray();
    }
}