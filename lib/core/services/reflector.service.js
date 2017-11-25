"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Reflector {
    get(metadataKey, target) {
        return Reflect.getMetadata(metadataKey, target);
    }
}
exports.Reflector = Reflector;
