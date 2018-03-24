import iterate from 'iterare';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import {
  isUndefined,
  isFunction,
  isNil,
  isEmpty,
} from '@nestjs/common/utils/shared.utils';
import { Controller } from '@nestjs/common/interfaces';
import { CanActivate, HttpStatus } from '@nestjs/common';
import { Observable } from 'rxjs/Observable';
import { FORBIDDEN_MESSAGE } from './constants';
import { ExecutionContextHost } from '../helpers/execution-context.host';

export class GuardsConsumer {
  public async tryActivate(
    guards: CanActivate[],
    args: any[],
    instance: Controller,
    callback: (...args) => any,
  ): Promise<boolean> {
    if (!guards || isEmpty(guards)) {
      return true;
    }
    const context = this.createContext(args, instance, callback);
    for (const guard of guards) {
      const result = guard.canActivate(context);
      if (await this.pickResult(result)) {
        continue;
      }
      return false;
    }
    return true;
  }

  public createContext(
    args: any[],
    instance: Controller,
    callback: (...args) => any,
  ): ExecutionContextHost {
    return new ExecutionContextHost(
      args,
      instance.constructor as any,
      callback,
    );
  }

  public async pickResult(
    result: boolean | Promise<boolean> | Observable<boolean>,
  ): Promise<boolean> {
    if (result instanceof Observable) {
      return await result.toPromise();
    }
    if (result instanceof Promise) {
      return await result;
    }
    return result;
  }
}
