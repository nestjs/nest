import { Injectable } from '@nestjs/common/interfaces/injectable.interface';
export declare class MetadataScanner {
    scanFromPrototype<T extends Injectable, R>(instance: T, prototype: any, callback: (name: string) => R): R[];
    getAllFilteredMethodNames(prototype: any): IterableIterator<string>;
}
