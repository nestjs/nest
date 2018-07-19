import { Observable } from 'rxjs';
import { ClientOptions } from '../interfaces/client-metadata.interface';
import { ClientGrpc } from './../interfaces';
import { ClientProxy } from './client-proxy';
export declare class ClientGrpcProxy extends ClientProxy implements ClientGrpc {
    private readonly options;
    private readonly logger;
    private readonly url;
    private grpcClient;
    constructor(options: ClientOptions);
    getService<T extends {}>(name: string): T;
    createServiceMethod(client: any, methodName: string): (...args) => Observable<any>;
    createStreamServiceMethod(client: any, methodName: string): (...args) => Observable<any>;
    createUnaryServiceMethod(client: any, methodName: string): (...args) => Observable<any>;
    createClient(): any;
    loadProto(): any;
    lookupPackage(root: any, packageName: string): any;
    close(): void;
    connect(): Promise<any>;
    send<TResult = any, TInput = any>(pattern: any, data: TInput): Observable<TResult>;
    protected publish(partialPacket: any, callback: (packet) => any): void;
}
