"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const iterare_1 = require("iterare");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
class MetadataScanner {
    scanFromPrototype(instance, prototype, callback) {
        return iterare_1.default(Object.getOwnPropertyNames(prototype))
            .filter((method) => {
            const descriptor = Object.getOwnPropertyDescriptor(prototype, method);
            if (descriptor.set || descriptor.get) {
                return false;
            }
            return !shared_utils_1.isConstructor(method) && shared_utils_1.isFunction(prototype[method]);
        })
            .map(callback)
            .filter((metadata) => !shared_utils_1.isNil(metadata))
            .toArray();
    }
}
exports.MetadataScanner = MetadataScanner;
