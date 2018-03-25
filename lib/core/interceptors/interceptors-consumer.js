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
require("rxjs/add/observable/defer");
require("rxjs/add/observable/fromPromise");
require("rxjs/add/operator/take");
require("rxjs/add/operator/switchMap");
class InterceptorsConsumer {
    intercept(interceptors, dataOrRequest, instance, callback, next) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!interceptors || shared_utils_1.isEmpty(interceptors)) {
                return yield yield next();
            }
            const context = this.createContext(instance, callback);
            const start$ = Observable_1.Observable.defer(() => this.transformDeffered(next));
            const result$ = yield interceptors.reduce((stream$, interceptor) => __awaiter(this, void 0, void 0, function* () { return yield interceptor.intercept(dataOrRequest, context, yield stream$); }), Promise.resolve(start$));
            return yield result$.toPromise();
        });
    }
    createContext(instance, callback) {
        return {
            parent: instance.constructor,
            handler: callback,
        };
    }
    transformDeffered(next) {
        return Observable_1.Observable.fromPromise(next()).switchMap(res => {
            const isDeffered = res instanceof Promise || res instanceof Observable_1.Observable;
            return isDeffered ? res : Promise.resolve(res);
        });
    }
}
exports.InterceptorsConsumer = InterceptorsConsumer;
