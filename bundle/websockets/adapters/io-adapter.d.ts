/// <reference types="node" />
import { Server } from 'http';
import { MessageMappingProperties } from '../gateway-metadata-explorer';
import { WebSocketAdapter } from '@nestjs/common';
import { Observable } from 'rxjs/Observable';
export declare class IoAdapter implements WebSocketAdapter {
    private readonly httpServer;
    constructor(httpServer?: Server | null);
    create(port: number): any;
    createWithNamespace(port: number, namespace: string, server?: any): any;
    createIOServer(port: number): any;
    bindClientConnect(server: any, callback: (...args) => void): void;
    bindClientDisconnect(client: any, callback: (...args) => void): void;
    bindMessageHandlers(client: any, handlers: MessageMappingProperties[], process: (data: any) => Observable<any>): void;
    bindMiddleware(server: any, middleware: (socket, next) => void): void;
}
