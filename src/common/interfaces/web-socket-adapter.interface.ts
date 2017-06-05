import { MessageMappingProperties } from '@nestjs/websockets/gateway-metadata-explorer';

export interface WebSocketAdapter {
    create(port: number);
    createWithNamespace?(port: number, namespace: string);
    bindClientConnect(server, callback: (...args) => void);
    bindClientDisconnect?(client, callback: (...args) => void);
    bindMessageHandlers(client, handlers: MessageMappingProperties[]);
    bindMiddleware?(server, middleware: (socket, next) => void);
}