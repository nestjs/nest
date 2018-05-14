import { ClientProxy } from './client-proxy';
import { ClientOptions } from '../interfaces/client-metadata.interface';
import { ClientGrpc } from './../interfaces';
import { Observable } from 'rxjs';
export declare class ClientGrpcProxy extends ClientProxy implements ClientGrpc {
    private readonly options;
    private readonly logger;
    private readonly url;
    private grpcClient;
    constructor(options: ClientOptions);
    getService<T = any>(name: string): T;
    createServiceMethod(client: any, methodName: string): (...args) => Observable<any>;
    createStreamServiceMethod(client: any, methodName: string): (...args) => Observable<any>;
    createUnaryServiceMethod(client: any, methodName: string): (...args) => Observable<any>;
    createClient(): any;
    loadProto(): any;
    lookupPackage(root: any, packageName: string): any;
    close(): void;
    connect(): Promise<any>;
    protected publish(partialPacket: any, callback: (packet) => any): Promise<void>;
}
