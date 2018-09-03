"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const params_token_factory_1 = require("./params-token-factory");
class PipesConsumer {
    constructor() {
        this.paramsTokenFactory = new params_token_factory_1.ParamsTokenFactory();
    }
    async apply(value, { metatype, type, data }, transforms) {
        const token = this.paramsTokenFactory.exchangeEnumForString(type);
        return await this.applyPipes(value, { metatype, type: token, data }, transforms);
    }
    async applyPipes(value, { metatype, type, data }, transforms) {
        return await transforms.reduce(async (defferedValue, fn) => {
            const val = await defferedValue;
            const result = fn(val, { metatype, type, data });
            return result;
        }, Promise.resolve(value));
    }
}
exports.PipesConsumer = PipesConsumer;
