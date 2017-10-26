import iterate from 'iterare';
import 'rxjs/add/operator/toPromise';
import { Observable } from 'rxjs/Observable';
import { GUARDS_METADATA } from '../constants';
import { HttpStatus } from '../enums/http-status.enum';
import { HttpException } from '../index';
import { CanActivate } from '../interfaces/can-activate.interface';
import { Controller } from '../interfaces/controllers/controller.interface';
import { ExecutionContext } from '../interfaces/execution-context.interface';
import { isEmpty, isFunction, isNil, isUndefined } from '../utils/shared.utils';
import { FORBIDDEN_MESSAGE } from './constants';

export class GuardsConsumer {
    public async tryActivate(guards: CanActivate[], data, instance: Controller, callback: (...args) => any): Promise<boolean> {
        if (!guards || isEmpty(guards)) {
            return true;
        }
        const context = this.createContext(instance, callback);
        for (const guard of guards) {
            const result = guard.canActivate(data, context);
            if (await this.pickResult(result)) {
                continue;
            }
            return false;
        }
        return true;
    }

    public createContext(instance: Controller, callback: (...args) => any): ExecutionContext {
        return {
            parent: instance.constructor,
            handler: callback,
        };
    }

    public async pickResult(result: boolean | Promise<boolean> | Observable<boolean>): Promise<boolean> {
        if (result instanceof Observable) {
            return await result.toPromise();
        }
        if (result instanceof Promise) {
            return await result;
        }
        return result;
    }
}
