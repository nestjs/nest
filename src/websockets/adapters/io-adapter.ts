import * as io from 'socket.io';
import { MessageMappingProperties } from '../gateway-metadata-explorer';
import { CONNECTION_EVENT, DISCONNECT_EVENT } from './../constants';

export class IoAdapter {
    public static create(port: number) {
        return io(port);
    }

    public static createWithNamespace(port: number, namespace: string) {
        return io(port).of(namespace);
    }

    public static bindClientConnect(server, callback: (...args) => void) {
        server.on(CONNECTION_EVENT, callback);
    }

    public static bindClientDisconnect(client, callback: (...args) => void) {
        client.on(DISCONNECT_EVENT, callback);
    }

    public static bindMessageHandlers(client, handlers: MessageMappingProperties[]) {
        handlers.forEach((handler) => {
            const { message, callback } = handler;
            client.on(message, callback);
        });
    }

    public static bindMiddleware(server, middleware: (socket, next) => void) {
        server.use(middleware);
    }
}