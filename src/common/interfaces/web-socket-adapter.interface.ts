import { MessageMappingProperties } from '@nestjs/websockets/gateway-metadata-explorer';

export interface WebSocketAdapter {
    create(port: number);
    createWithNamespace?(port: number, namespace: string);
    bindClientConnect(server, callback: (...args) => void);
    bindClientDisconnect?(client, callback: (...args) => void);
    bindMessageHandler(client, handler: MessageMappingProperties, process: (data: any) => Promise<any>);
    bindMiddleware?(server, middleware: (socket, next) => void);
}