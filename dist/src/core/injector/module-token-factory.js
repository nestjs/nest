"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const constants_1 = require("@nestjs/common/constants");
class ModuleTokenFactory {
    create(metatype, scope) {
        const reflectedScope = this.reflectScope(metatype);
        const opaqueToken = {
            module: this.getModuleName(metatype),
            scope: shared_utils_1.isUndefined(reflectedScope) ? this.getScopeStack(scope) : reflectedScope,
        };
        return JSON.stringify(opaqueToken);
    }
    getModuleName(metatype) {
        return metatype.name;
    }
    getScopeStack(scope) {
        const reversedScope = scope.reverse();
        const firstGlobalIndex = reversedScope.findIndex((s) => this.reflectScope(s) === 'global');
        const scopeStack = scope.reverse().slice(scope.length - firstGlobalIndex - 1);
        return scopeStack.map((module) => module.name);
    }
    reflectScope(metatype) {
        return Reflect.getMetadata(constants_1.SHARED_MODULE_METADATA, metatype);
    }
}
exports.ModuleTokenFactory = ModuleTokenFactory;
//# sourceMappingURL=module-token-factory.js.map