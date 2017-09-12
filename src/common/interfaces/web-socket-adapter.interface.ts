import { MessageMappingProperties } from '@nestjs/websockets/gateway-metadata-explorer';
import { Observable } from 'rxjs/Observable';

export interface WebSocketAdapter {
    create(port: number);
    createWithNamespace?(port: number, namespace: string);
    bindClientConnect(server, callback: (...args) => void);
    bindClientDisconnect?(client, callback: (...args) => void);
    bindMessageHandlers(client, handler: MessageMappingProperties[], process: (data) => Observable<any>);
    bindMiddleware?(server, middleware: (socket, next) => void);
}