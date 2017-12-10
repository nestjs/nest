import { MessageMappingProperties } from '@nestjs/websockets/gateway-metadata-explorer';
import { Observable } from 'rxjs/Observable';

export interface WebSocketAdapter {
    create(port: number): any;
    createWithNamespace?(port: number, namespace: string): any;
    bindClientConnect(server: any, callback: (...args: any[]) => void): any;
    bindClientDisconnect?(client: any, callback: (...args: any[]) => void): any;
    bindMessageHandlers(client: any, handler: MessageMappingProperties[], process: (data: any) => Observable<any>): any;
    bindMiddleware?(server: any, middleware: (socket: any, next: Function) => void): any;
}
