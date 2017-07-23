import iterate from 'iterare';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { isUndefined, isFunction, isNil, isEmpty } from '@nestjs/common/utils/shared.utils';
import { Controller } from '@nestjs/common/interfaces';
import { CanActivate, HttpStatus } from '@nestjs/common';
import { Observable } from 'rxjs/Observable';
import { HttpException } from '../index';
import { FORBIDDEN_MESSAGE } from './constants';
import 'rxjs/add/operator/toPromise';

export class GuardsConsumer {
    public async tryActivate(guards: CanActivate[], data, instance: Controller, callback: (...args) => any): Promise<boolean> {
        if (!guards || isEmpty(guards)) {
            return true;
        }
        for (const guard of guards) {
            const result = guard.canActivate(data, instance, callback);
            if (await this.pickResult(result)) {
                continue;
            }
            return false;
        }
        return true;
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