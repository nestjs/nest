/// <reference types="node" />
import { Server } from './server';
import { CustomTransportStrategy } from './../interfaces';
import { MicroserviceConfiguration } from '../interfaces/microservice-configuration.interface';
export declare class ServerTCP extends Server implements CustomTransportStrategy {
    private readonly config;
    private readonly port;
    private server;
    private isExplicitlyTerminated;
    private retryAttemptsCount;
    constructor(config: MicroserviceConfiguration);
    listen(callback: () => void): void;
    close(): void;
    bindHandler(socket: any): void;
    handleMessage(socket: any, msg: {
        pattern: any;
        data: {};
<<<<<<< HEAD
    }): Promise<void>;
    handleClose(): undefined | number | NodeJS.Timer;
=======
    }): Promise<any>;
>>>>>>> master
    private init();
    private getSocketInstance(socket);
}
