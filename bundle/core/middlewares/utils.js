"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
exports.filterMiddlewares = middlewares => {
    return []
        .concat(middlewares)
        .filter(shared_utils_1.isFunction)
        .map(middleware => exports.mapToClass(middleware));
};
exports.mapToClass = middleware => {
    if (this.isClass(middleware)) {
        return middleware;
    }
    return exports.assignToken(class {
        constructor() {
            this.resolve = (...args) => (...params) => middleware(...params);
        }
    });
};
exports.isClass = middleware => {
    return middleware.toString().substring(0, 5) === 'class';
};
exports.assignToken = (metatype) => {
    this.id = this.id || 1;
    Object.defineProperty(metatype, 'name', { value: ++this.id });
    return metatype;
};
