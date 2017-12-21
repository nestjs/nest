import { Controller } from '@nestjs/common/interfaces';
import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/toPromise';
export declare class GuardsConsumer {
  tryActivate(
    guards: CanActivate[],
    data: any,
    instance: Controller,
    callback: (...args) => any
  ): Promise<boolean>;
  createContext(
    instance: Controller,
    callback: (...args) => any
  ): ExecutionContext;
  pickResult(
    result: boolean | Promise<boolean> | Observable<boolean>
  ): Promise<boolean>;
}
