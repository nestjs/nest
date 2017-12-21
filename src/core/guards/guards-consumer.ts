import 'rxjs/add/operator/toPromise';

import { CanActivate, ExecutionContext, HttpStatus } from '@nestjs/common';
import { isEmpty, isFunction, isNil, isUndefined } from '@nestjs/common/utils/shared.utils';

import { Controller } from '@nestjs/common/interfaces';
import { FORBIDDEN_MESSAGE } from './constants';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Observable } from 'rxjs/Observable';
import iterate from 'iterare';

export class GuardsConsumer {
    public async tryActivate(guards: CanActivate[], data: any, instance: Controller, callback: (...args: any[]) => any): Promise<boolean> {
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

    public createContext(instance: Controller, callback: (...args: any[]) => any): ExecutionContext {
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
