import { ExecutionContext } from '@nestjs/common';
import { Type } from '@nestjs/common/interfaces';
import { RpcArgumentsHost, WsArgumentsHost, HttpArgumentsHost } from '@nestjs/common/interfaces/features/arguments-host.interface';
export declare class ExecutionContextHost implements ExecutionContext {
    private readonly args;
    private readonly constructorRef;
    private readonly handler;
    constructor(args: any[], constructorRef?: Type<any>, handler?: Function);
    getClass<T = any>(): Type<T>;
    getHandler(): Function;
    getArgs<T extends Array<any> = any[]>(): T;
    getArgByIndex<T = any>(index: number): T;
    switchToRpc(): RpcArgumentsHost;
    switchToHttp(): HttpArgumentsHost;
    switchToWs(): WsArgumentsHost;
}
