/// <reference types="node" />
import { INestApplicationContext, Logger, WebSocketAdapter } from '@nestjs/common';
import { Server } from 'http';
import { Observable } from 'rxjs';
import { MessageMappingProperties } from '../gateway-metadata-explorer';
export declare class WsAdapter implements WebSocketAdapter {
    protected readonly logger: Logger;
    protected readonly httpServer: Server;
    constructor(appOrHttpServer?: INestApplicationContext | Server);
    create(port: number, options?: any & {
        namespace?: string;
        server?: any;
    }): any;
    bindClientConnect(server: any, callback: (...args) => void): void;
    bindClientDisconnect(client: any, callback: (...args) => void): void;
    bindMessageHandlers(client: any, handlers: MessageMappingProperties[], transform: (data: any) => Observable<any>): void;
    bindMessageHandler(buffer: any, handlers: MessageMappingProperties[], transform: (data: any) => Observable<any>): Observable<any>;
    close(server: any): void;
    bindErrorHandler(server: any): any;
}
