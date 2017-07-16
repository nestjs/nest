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
const params_token_factory_1 = require("./../pipes/params-token-factory");
class PipesConsumer {
    constructor() {
        this.paramsTokenFactory = new params_token_factory_1.ParamsTokenFactory();
    }
    apply(value, { metatype, type, data }, transforms) {
        return __awaiter(this, void 0, void 0, function* () {
            const token = this.paramsTokenFactory.exchangeEnumForString(type);
            return yield transforms.reduce((defferedValue, fn) => __awaiter(this, void 0, void 0, function* () {
                const val = yield defferedValue;
                const result = fn(val, { metatype, type: token, data });
                if (result instanceof Promise) {
                    return result;
                }
                return Promise.resolve(result);
            }), Promise.resolve(value));
        });
    }
}
exports.PipesConsumer = PipesConsumer;
//# sourceMappingURL=pipes-consumer.js.map