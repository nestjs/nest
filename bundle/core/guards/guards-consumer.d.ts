import { Controller } from '@nestjs/common/interfaces';
import { CanActivate } from '@nestjs/common';
import { Observable } from 'rxjs';
import { ExecutionContextHost } from '../helpers/execution-context.host';
export declare class GuardsConsumer {
    tryActivate(guards: CanActivate[], args: any[], instance: Controller, callback: (...args) => any): Promise<boolean>;
    createContext(args: any[], instance: Controller, callback: (...args) => any): ExecutionContextHost;
    pickResult(result: boolean | Promise<boolean> | Observable<boolean>): Promise<boolean>;
}
