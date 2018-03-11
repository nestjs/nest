import { Server } from './server';
import { CustomTransportStrategy } from './../interfaces';
import 'rxjs/add/operator/catch';
import 'rxjs/add/observable/empty';
import 'rxjs/add/operator/finally';
export declare class ServerTCP extends Server implements CustomTransportStrategy {
    private readonly port;
    private server;
    constructor(config: any);
    listen(callback: () => void): void;
    close(): void;
    bindHandler(socket: any): void;
    handleMessage(socket: any, msg: {
        pattern: any;
        data: {};
    }): Promise<any>;
    private init();
    private getSocketInstance(socket);
}
