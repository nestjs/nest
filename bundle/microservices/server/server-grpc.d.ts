import { CustomTransportStrategy } from '../interfaces';
import { MicroserviceOptions } from '../interfaces/microservice-configuration.interface';
import { Server } from './server';
export declare class ServerGrpc extends Server implements CustomTransportStrategy {
    private readonly options;
    private readonly url;
    private grpcClient;
    constructor(options: MicroserviceOptions['options']);
    listen(callback: () => void): Promise<void>;
    start(callback?: () => void): Promise<void>;
    bindEvents(): Promise<void>;
    getServiceNames(grpcPkg: any): string[];
    createService(grpcService: any, name: string): Promise<{}>;
    createPattern(service: string, methodName: string): string;
    createServiceMethod(methodHandler: Function, protoNativeHandler: any): Function;
    createUnaryServiceMethod(methodHandler: any): Function;
    createStreamServiceMethod(methodHandler: any): Function;
    close(): void;
    deserialize(obj: any): any;
    createClient(): any;
    lookupPackage(root: any, packageName: string): any;
    loadProto(): any;
}
