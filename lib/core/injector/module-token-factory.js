"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("@nestjs/common/constants");
class ModuleTokenFactory {
    create(metatype, scope, dynamicModuleMetadata) {
        const reflectedScope = this.reflectScope(metatype);
        const isSingleScoped = reflectedScope === true;
        const opaqueToken = {
            module: this.getModuleName(metatype),
            dynamic: this.getDynamicMetadataToken(dynamicModuleMetadata),
            scope: isSingleScoped ? this.getScopeStack(scope) : reflectedScope,
        };
        return JSON.stringify(opaqueToken);
    }
    getDynamicMetadataToken(dynamicModuleMetadata) {
        return dynamicModuleMetadata ? JSON.stringify(dynamicModuleMetadata) : '';
    }
    getModuleName(metatype) {
        return metatype.name;
    }
    getScopeStack(scope) {
        const reversedScope = scope.reverse();
        const firstGlobalIndex = reversedScope.findIndex(s => this.reflectScope(s) === 'global');
        scope.reverse();
        const stack = firstGlobalIndex >= 0
            ? scope.slice(scope.length - firstGlobalIndex - 1)
            : scope;
        return stack.map(module => module.name);
    }
    reflectScope(metatype) {
        const reflectedScope = Reflect.getMetadata(constants_1.SHARED_MODULE_METADATA, metatype);
        return reflectedScope ? reflectedScope : 'global';
    }
}
exports.ModuleTokenFactory = ModuleTokenFactory;
