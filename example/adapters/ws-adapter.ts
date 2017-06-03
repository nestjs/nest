import * as WebSocket from 'ws';
import { WebSocketAdapter } from '@nestjs/common';
import { MessageMappingProperties } from '@nestjs/websockets';

class WsAdapter implements WebSocketAdapter {
    public create(port: number) {
        return new WebSocket.Server({ port });
    }
    public bindClientConnect(server, callback: (...args: any[]) => void) {
        server.on('connection', callback);
    }
    public bindMessageHandlers(client, handlers: MessageMappingProperties[]) {
        client.on('message', (buffer) => {
            const data = JSON.parse(buffer);
            const { type } = data;
            const messageHandler = handlers.find((handler) => handler.message === type);
            messageHandler && messageHandler.callback(data);
        });
    }
}