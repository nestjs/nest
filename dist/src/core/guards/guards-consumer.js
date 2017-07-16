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
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const common_1 = require("@nestjs/common");
const Observable_1 = require("rxjs/Observable");
require("rxjs/add/operator/toPromise");
const index_1 = require("../index");
const constants_1 = require("./constants");
class GuardsConsumer {
    tryActivate(guards, request, instance, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!guards || shared_utils_1.isEmpty(guards))
                return;
            for (const guard of guards) {
                const result = yield guard.canActivate(request, instance, callback);
                if (result)
                    continue;
                throw new index_1.HttpException(constants_1.FORBIDDEN_MESSAGE, common_1.HttpStatus.FORBIDDEN);
            }
        });
    }
    pickResult(result) {
        return __awaiter(this, void 0, void 0, function* () {
            if (result instanceof Observable_1.Observable) {
                return yield result.toPromise();
            }
            if (result instanceof Promise) {
                return yield result;
            }
            return result;
        });
    }
}
exports.GuardsConsumer = GuardsConsumer;
//# sourceMappingURL=guards-consumer.js.map