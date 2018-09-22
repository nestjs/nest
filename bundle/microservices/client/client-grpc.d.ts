import { Logger } from '@nestjs/common/services/logger.service';
import { Observable } from 'rxjs';
import { ClientGrpc } from '../interfaces';
import { ClientOptions } from '../interfaces/client-metadata.interface';
import { ClientProxy } from './client-proxy';
export declare class ClientGrpcProxy extends ClientProxy implements ClientGrpc {
    protected readonly options: ClientOptions['options'];
    protected readonly logger: Logger;
    protected readonly url: string;
    protected grpcClient: any;
    constructor(options: ClientOptions['options']);
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
