/// <reference types="node" />
/// <reference types="socket.io" />
import { Server } from 'http';
import { MessageMappingProperties } from '../gateway-metadata-explorer';
import { WebSocketAdapter } from '@nestjs/common';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/fromEvent';
import 'rxjs/add/operator/switchMap';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/do';
export declare class IoAdapter implements WebSocketAdapter {
    private readonly httpServer;
    constructor(httpServer?: Server | null);
    create(port: number): SocketIO.Server;
    createWithNamespace(port: number, namespace: string, server?: any): SocketIO.Namespace;
    createIOServer(port: number): SocketIO.Server;
    bindClientConnect(server: any, callback: (...args) => void): void;
    bindClientDisconnect(client: any, callback: (...args) => void): void;
    bindMessageHandlers(client: any, handlers: MessageMappingProperties[], process: (data: any) => Observable<any>): void;
    bindMiddleware(server: any, middleware: (socket, next) => void): void;
}
