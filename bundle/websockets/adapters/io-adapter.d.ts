/// <reference types="node" />
import { WebSocketAdapter } from '@nestjs/common';
import { Server } from 'http';
import { Observable } from 'rxjs';
import { MessageMappingProperties } from '../gateway-metadata-explorer';
export declare class IoAdapter implements WebSocketAdapter {
    private readonly httpServer;
    constructor(httpServer?: Server | null);
    create(port: number, options?: any & {
        namespace?: string;
        server?: any;
    }): any;
    createIOServer(port: number, options?: any): any;
    bindClientConnect(server: any, callback: (...args) => void): void;
    bindClientDisconnect(client: any, callback: (...args) => void): void;
    bindMessageHandlers(client: any, handlers: MessageMappingProperties[], transform: (data: any) => Observable<any>): void;
    bindMiddleware(server: any, middleware: (socket, next) => void): void;
    close(server: any): void;
}
