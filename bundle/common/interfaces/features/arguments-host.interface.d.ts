export interface HttpArgumentsHost {
    getRequest<T = any>(): T;
    getResponse<T = any>(): T;
}
export interface WsArgumentsHost {
    getData<T = any>(): T;
    getClient<T = any>(): T;
}
export interface RpcArgumentsHost {
    getData<T = any>(): T;
}
export interface ArgumentsHost {
    getArgs<T extends Array<any> = any[]>(): T;
    getArgByIndex<T = any>(index: number): T;
    switchToRpc(): RpcArgumentsHost;
    switchToHttp(): HttpArgumentsHost;
    switchToWs(): WsArgumentsHost;
}
