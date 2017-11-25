"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
class ContextCreator {
    createContext(instance, callback, metadataKey) {
        const globalMetadata = this.getGlobalMetadata && this.getGlobalMetadata();
        const classMetadata = this.reflectClassMetadata(instance, metadataKey);
        const methodMetadata = this.reflectMethodMetadata(callback, metadataKey);
        return [
            ...this.createConcreteContext(globalMetadata || []),
            ...this.createConcreteContext(classMetadata),
            ...this.createConcreteContext(methodMetadata),
        ];
    }
    reflectClassMetadata(instance, metadataKey) {
        const prototype = Object.getPrototypeOf(instance);
        return Reflect.getMetadata(metadataKey, prototype.constructor);
    }
    reflectMethodMetadata(callback, metadataKey) {
        return Reflect.getMetadata(metadataKey, callback);
    }
}
exports.ContextCreator = ContextCreator;
