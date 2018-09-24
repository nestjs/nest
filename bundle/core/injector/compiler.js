"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
const module_token_factory_1 = require("./module-token-factory");
class ModuleCompiler {
    constructor() {
        this.moduleTokenFactory = new module_token_factory_1.ModuleTokenFactory();
    }
    async compile(metatype, scope) {
        const { type, dynamicMetadata } = await this.extractMetadata(metatype);
        const token = this.moduleTokenFactory.create(type, scope, dynamicMetadata);
        return { type, dynamicMetadata, token };
    }
    async extractMetadata(metatype) {
        metatype = await metatype;
        if (!this.isDynamicModule(metatype)) {
            return { type: metatype };
        }
        const { module: type } = metatype, dynamicMetadata = __rest(metatype, ["module"]);
        return { type, dynamicMetadata };
    }
    isDynamicModule(module) {
        return !!module.module;
    }
}
exports.ModuleCompiler = ModuleCompiler;
