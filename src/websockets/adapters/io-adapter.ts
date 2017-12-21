import 'rxjs/add/observable/fromEvent';
import 'rxjs/add/operator/switchMap';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/do';

import * as io from 'socket.io';

import { CONNECTION_EVENT, DISCONNECT_EVENT } from '../constants';

import { Express } from 'express';
import { MessageMappingProperties } from '../gateway-metadata-explorer';
import { NextFunction } from 'express-serve-static-core';
import { Observable } from 'rxjs/Observable';
import { Server } from 'http';
import { WebSocketAdapter } from '@nestjs/common';

export class IoAdapter implements WebSocketAdapter {
    constructor(private readonly httpServer: Server | null = null) { }

    public create(port: number) {
        return this.createIOServer(port);
    }

    public createWithNamespace(port: number, namespace: string, server?: any) {
        return this.createIOServer(port).of(namespace);
    }

    public createIOServer(port: number) {
        if (this.httpServer && port === 0) {
            return io.listen(this.httpServer);
        }
        return io(port);
    }

    public bindClientConnect(server: Server, callback: (...args: any[]) => void) {
        server.on(CONNECTION_EVENT, callback);
    }

    public bindClientDisconnect(client: SocketIO.Socket, callback: (...args: any[]) => void) {
        client.on(DISCONNECT_EVENT, callback);
    }

    public bindMessageHandlers(
        client: SocketIO.Socket,
        handlers: MessageMappingProperties[],
        process: (data: any) => Observable<any>,
    ) {
        handlers.forEach(({ message, callback }) => Observable.fromEvent(client, message)
            .switchMap((data) => process(callback(data)))
            .filter((result) => !!result && result.event)
            .subscribe(({ event, data }) => client.emit(event, data)),
        );
    }

    public bindMiddleware(server: Express, middleware: (socket: any, next: any) => void) {
        server.use(middleware);
    }
}
