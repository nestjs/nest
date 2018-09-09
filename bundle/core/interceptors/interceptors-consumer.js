"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const execution_context_host_1 = require("../helpers/execution-context.host");
class InterceptorsConsumer {
    async intercept(interceptors, args, instance, callback, next) {
        if (shared_utils_1.isEmpty(interceptors)) {
            return await await next();
        }
        const context = this.createContext(args, instance, callback);
        const start$ = rxjs_1.defer(() => this.transformDeffered(next));
        /***
          const nextFn =  (i: number) => async () => {
          if (i <= interceptors.length) {
            return start$;
          }
          return await interceptors[i].intercept(context, nextFn(i + 1) as any);
        };
        */
        const result$ = await interceptors.reduce(async (stream$, interceptor) => await interceptor.intercept(context, await stream$), Promise.resolve(start$));
        return await result$.toPromise();
    }
    createContext(args, instance, callback) {
        return new execution_context_host_1.ExecutionContextHost(args, instance.constructor, callback);
    }
    transformDeffered(next) {
        return rxjs_1.from(next()).pipe(operators_1.switchMap(res => {
            const isDeffered = res instanceof Promise || res instanceof rxjs_1.Observable;
            return isDeffered ? res : Promise.resolve(res);
        }));
    }
}
exports.InterceptorsConsumer = InterceptorsConsumer;
