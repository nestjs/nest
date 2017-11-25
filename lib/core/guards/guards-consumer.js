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
const Observable_1 = require("rxjs/Observable");
require("rxjs/add/operator/toPromise");
class GuardsConsumer {
    tryActivate(guards, data, instance, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!guards || shared_utils_1.isEmpty(guards)) {
                return true;
            }
            const context = this.createContext(instance, callback);
            for (const guard of guards) {
                const result = guard.canActivate(data, context);
                if (yield this.pickResult(result)) {
                    continue;
                }
                return false;
            }
            return true;
        });
    }
    createContext(instance, callback) {
        return {
            parent: instance.constructor,
            handler: callback,
        };
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
