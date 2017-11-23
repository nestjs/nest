"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const injector_1 = require("../injector/injector");
class MiddlewaresResolver {
    constructor(middlewaresContainer) {
        this.middlewaresContainer = middlewaresContainer;
        this.instanceLoader = new injector_1.Injector();
    }
    resolveInstances(module, moduleName) {
        return __awaiter(this, void 0, void 0, function* () {
            const middlewares = this.middlewaresContainer.getMiddlewares(moduleName);
            yield Promise.all([...middlewares.values()].map((wrapper) => __awaiter(this, void 0, void 0, function* () { return yield this.resolveMiddlewareInstance(wrapper, middlewares, module); })));
        });
    }
    resolveMiddlewareInstance(wrapper, middlewares, module) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.instanceLoader.loadInstanceOfMiddleware(wrapper, middlewares, module);
        });
    }
}
exports.MiddlewaresResolver = MiddlewaresResolver;
