import { Controller } from '@nestjs/common/interfaces';
import 'reflect-metadata';
export declare abstract class ContextCreator {
    abstract createConcreteContext<T extends any[], R extends any[]>(metadata: T): R;
    getGlobalMetadata?<T extends any[]>(): T;
    createContext<T extends any[], R extends any[]>(instance: Controller, callback: (...args) => any, metadataKey: string): R;
    reflectClassMetadata<T>(instance: Controller, metadataKey: string): T;
    reflectMethodMetadata<T>(callback: (...args) => any, metadataKey: string): T;
}
