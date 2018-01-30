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
const common_1 = require("@nestjs/common");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
require("rxjs/add/operator/toPromise");
class RouterResponseController {
    apply(resultOrDeffered, response, httpStatusCode) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.transformToResult(resultOrDeffered);
            const res = response.status(httpStatusCode);
            if (shared_utils_1.isNil(result)) {
                return res.send();
            }
            return shared_utils_1.isObject(result) ? res.json(result) : res.send(String(result));
        });
    }
    transformToResult(resultOrDeffered) {
        return __awaiter(this, void 0, void 0, function* () {
            if (resultOrDeffered instanceof Promise) {
                return yield resultOrDeffered;
            }
            else if (resultOrDeffered && shared_utils_1.isFunction(resultOrDeffered.subscribe)) {
                return yield resultOrDeffered.toPromise();
            }
            return resultOrDeffered;
        });
    }
    getStatusByMethod(requestMethod) {
        switch (requestMethod) {
            case common_1.RequestMethod.POST:
                return common_1.HttpStatus.CREATED;
            default:
                return common_1.HttpStatus.OK;
        }
    }
}
exports.RouterResponseController = RouterResponseController;
