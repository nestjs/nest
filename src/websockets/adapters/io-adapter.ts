import * as io from 'socket.io';
import { MessageMappingProperties } from '../gateway-metadata-explorer';
import { CONNECTION_EVENT, DISCONNECT_EVENT } from './../constants';
import { WebSocketAdapter } from '@nestjs/common';

export class IoAdapter implements WebSocketAdapter {
    public create(port: number) {
        return io(port);
    }

    public createWithNamespace(port: number, namespace: string) {
        return io(port).of(namespace);
    }

    public bindClientConnect(server, callback: (...args) => void) {
        server.on(CONNECTION_EVENT, callback);
    }

    public bindClientDisconnect(client, callback: (...args) => void) {
        client.on(DISCONNECT_EVENT, callback);
    }

    public bindMessageHandlers(client, handlers: MessageMappingProperties[]) {
        handlers.forEach((handler) => {
            const { message, callback } = handler;
            client.on(message, callback);
        });
    }

    public bindMiddleware(server, middleware: (socket, next) => void) {
        server.use(middleware);
    }
}