import { MessageMappingProperties } from '@nestjs/websockets/gateway-metadata-explorer';
import { Observable } from 'rxjs/Observable';
export interface WebSocketAdapter {
    create(port: number): any;
    createWithNamespace?(port: number, namespace: string): any;
    bindClientConnect(server: any, callback: (...args) => void): any;
    bindClientDisconnect?(client: any, callback: (...args) => void): any;
    bindMessageHandlers(client: any, handler: MessageMappingProperties[], process: (data) => Observable<any>): any;
    bindMiddleware?(server: any, middleware: (socket, next) => void): any;
}
