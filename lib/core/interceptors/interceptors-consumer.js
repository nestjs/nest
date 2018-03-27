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
const defer_1 = require("rxjs/observable/defer");
const fromPromise_1 = require("rxjs/observable/fromPromise");
const operators_1 = require("rxjs/operators");
const execution_context_host_1 = require("../helpers/execution-context.host");
class InterceptorsConsumer {
    intercept(interceptors, args, instance, callback, next) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!interceptors || shared_utils_1.isEmpty(interceptors)) {
                return yield yield next();
            }
            const context = this.createContext(args, instance, callback);
            const start$ = defer_1.defer(() => this.transformDeffered(next));
            const result$ = yield interceptors.reduce((stream$, interceptor) => __awaiter(this, void 0, void 0, function* () { return yield interceptor.intercept(context, yield stream$); }), Promise.resolve(start$));
            return yield result$.toPromise();
        });
    }
    createContext(args, instance, callback) {
        return new execution_context_host_1.ExecutionContextHost(args, instance.constructor, callback);
    }
    transformDeffered(next) {
        return fromPromise_1.fromPromise(next()).pipe(operators_1.switchMap(res => {
            const isDeffered = res instanceof Promise || res instanceof Observable_1.Observable;
            return isDeffered ? res : Promise.resolve(res);
        }));
    }
}
exports.InterceptorsConsumer = InterceptorsConsumer;
