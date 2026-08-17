import type { CanActivate } from '@nestjs/common';
import { lastValueFrom, Observable } from 'rxjs';
import { ExecutionContextHost } from '../helpers/execution-context-host.js';
import type { ContextType } from '@nestjs/common';
import { type Controller, isEmptyArray } from '@nestjs/common/internal';

export class GuardsConsumer {
  public async tryActivate<TContext extends string = ContextType>(
    guards: CanActivate[],
    args: unknown[],
    instance: Controller,
    callback: (...args: unknown[]) => unknown,
    type?: TContext,
  ): Promise<boolean> {
    if (!guards || isEmptyArray(guards)) {
      return true;
    }
    const context = this.createContext(args, instance, callback);
    context.setType<TContext>(type!);

    for (const guard of guards) {
      const result = guard.canActivate(context);
      if (typeof result === 'boolean') {
        if (!result) {
          return false;
        }
        continue;
      }
      if (await this.pickResult(result)) {
        continue;
      }
      return false;
    }
    return true;
  }

  public createContext(
    args: unknown[],
    instance: Controller,
    callback: (...args: unknown[]) => unknown,
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
      return lastValueFrom(result);
    }
    return result;
  }
}
